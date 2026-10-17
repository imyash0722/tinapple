import React, { useState } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Terminal,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import HoldButton from '../reactbits/HoldButton';
import { ServiceInfo } from '../../types/api';

interface ServicesManagerProps {
  services: ServiceInfo[];
  onControlService: (name: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable') => Promise<void>;
  onOpenLogs: (name: string) => void;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({
  services,
  onControlService,
  onOpenLogs,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loadingMap, setLoadingMap] = useState<Record<string, string>>({});

  const handleAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setLoadingMap((prev) => ({ ...prev, [name]: action }));
    try {
      await onControlService(name, action);
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

  const filteredServices = services.filter((s) => {
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'core', 'media', 'database', 'network', 'desktop'];

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3.5 rounded-2xl bg-tinapple-card/80 border border-tinapple-border backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize font-mono transition-all whitespace-nowrap ${
                  filterCategory === c
                    ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                    : 'text-tinapple-subtext hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tinapple-muted" />
            <input
              type="text"
              placeholder="Filter daemons or ports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-tinapple-dark/90 border border-tinapple-border text-xs font-mono text-tinapple-text placeholder:text-tinapple-muted focus:outline-none focus:border-tinapple-gold transition-colors"
            />
          </div>

          {/* Quick Action HoldButton & View Toggle */}
          <div className="flex items-center gap-2">
            <HoldButton
              size="sm"
              holdTime={1400}
              backgroundColor="#15181f"
              fillColor="#e5b567"
              textColor="#e5b567"
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
              className="font-mono text-xs font-bold whitespace-nowrap"
            >
              Hold to Restart Core
            </HoldButton>

            <div className="flex items-center p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-tinapple-surface text-tinapple-gold'
                    : 'text-tinapple-muted hover:text-white'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-tinapple-surface text-tinapple-gold'
                    : 'text-tinapple-muted hover:text-white'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const isLoading = Boolean(loadingMap[service.name]);
            const isActive = service.activeState === 'active';

            return (
              <SpotlightCard
                key={service.name}
                className="p-5 flex flex-col justify-between"
                spotlightColor={isActive ? 'rgba(126, 199, 137, 0.12)' : 'rgba(229, 181, 103, 0.08)'}
                borderColor={isActive ? 'rgba(126, 199, 137, 0.4)' : 'rgba(255, 255, 255, 0.08)'}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isActive
                              ? 'bg-tinapple-green shadow-sm shadow-tinapple-green animate-pulse'
                              : 'bg-tinapple-muted'
                          }`}
                        />
                        <h4 className="text-sm font-bold text-white font-mono truncate">
                          {service.name}
                        </h4>
                      </div>
                      <p className="text-xs text-tinapple-subtext mt-1 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${
                        isActive
                          ? 'bg-tinapple-green/10 text-tinapple-green border-tinapple-green/20 font-semibold'
                          : 'bg-tinapple-muted/10 text-tinapple-muted border-tinapple-border'
                      }`}
                    >
                      {service.activeState}
                    </span>
                  </div>

                  {/* Service Metadata: Port & RAM */}
                  <div className="flex items-center gap-3 my-3 text-[11px] font-mono text-tinapple-muted">
                    {service.port && (
                      <span className="flex items-center gap-1 text-tinapple-gold font-semibold">
                        Port :{service.port}
                      </span>
                    )}
                    {service.memoryBytes && (
                      <span>RAM: {(service.memoryBytes / (1024 * 1024)).toFixed(0)} MB</span>
                    )}
                    <span className="capitalize text-tinapple-green font-medium">{service.category}</span>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-tinapple-border/70">
                  <div className="flex items-center gap-1.5 font-mono">
                    {isActive ? (
                      <>
                        <button
                          disabled={isLoading}
                          onClick={() => handleAction(service.name, 'restart')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-tinapple-dark/90 hover:bg-tinapple-surface border border-tinapple-border text-tinapple-text transition-colors disabled:opacity-50 active:scale-95"
                          title="Restart daemon"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-tinapple-gold' : ''}`} />
                          <span>Restart</span>
                        </button>
                        <button
                          disabled={isLoading}
                          onClick={() => handleAction(service.name, 'stop')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-tinapple-red/10 hover:bg-tinapple-red/20 border border-tinapple-red/20 text-tinapple-red transition-colors disabled:opacity-50 active:scale-95"
                          title="Stop daemon"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={isLoading}
                        onClick={() => handleAction(service.name, 'start')}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-tinapple-green/15 hover:bg-tinapple-green/25 border border-tinapple-green/30 text-tinapple-green transition-colors disabled:opacity-50 active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenLogs(service.name)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-tinapple-dark/80 hover:bg-tinapple-surface border border-tinapple-border text-tinapple-subtext hover:text-white transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-tinapple-gold" />
                    <span>Logs</span>
                  </button>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      ) : (
        /* Services Table View */
        <div className="overflow-x-auto rounded-2xl border border-tinapple-border bg-tinapple-card/80 backdrop-blur-2xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-tinapple-dark/80 text-tinapple-subtext uppercase text-[10px] tracking-wider border-b border-tinapple-border">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Memory</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tinapple-border/50 text-tinapple-text">
              {filteredServices.map((service) => {
                const isActive = service.activeState === 'active';
                return (
                  <tr key={service.name} className="hover:bg-tinapple-surface/40 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border ${
                          isActive
                            ? 'bg-tinapple-green/10 text-tinapple-green border-tinapple-green/20 font-semibold'
                            : 'bg-tinapple-muted/10 text-tinapple-muted border-tinapple-border'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-tinapple-green animate-pulse' : 'bg-tinapple-muted'
                          }`}
                        />
                        {service.activeState}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{service.name}</td>
                    <td className="px-4 py-3 capitalize text-tinapple-green">{service.category}</td>
                    <td className="px-4 py-3 text-tinapple-gold font-semibold">
                      {service.port ? `:${service.port}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-tinapple-subtext">
                      {service.memoryBytes
                        ? `${(service.memoryBytes / (1024 * 1024)).toFixed(0)} MB`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAction(service.name, isActive ? 'stop' : 'start')}
                          className="px-2.5 py-1 rounded-lg bg-tinapple-dark/90 hover:bg-tinapple-surface border border-tinapple-border text-[11px] font-semibold text-tinapple-text"
                        >
                          {isActive ? 'Stop' : 'Start'}
                        </button>
                        <button
                          onClick={() => onOpenLogs(service.name)}
                          className="px-2.5 py-1 rounded-lg bg-tinapple-dark/90 hover:bg-tinapple-surface border border-tinapple-border text-[11px] text-tinapple-gold"
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
