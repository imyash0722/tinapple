import React, { useState } from 'react';
import {
  Monitor,
  Film,
  DownloadCloud,
  Database,
  ShieldCheck,
  Archive,
  Check,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { StarBorder } from '../reactbits/StarBorder';
import { ApplianceProfile } from '../../types/api';

const DEFAULT_PROFILES: ApplianceProfile[] = [
  {
    id: 'desktop',
    name: 'ChadWM Desktop Station',
    category: 'Workstation',
    icon: 'Monitor',
    tagline: 'Minimal Wayland tiling compositor & Ironbar desktop',
    description:
      'Ultra-responsive wlroots environment with ChadWM, Alacritty, Foot, PipeWire sound, and custom gold/sage theme.',
    installed: true,
    status: 'active',
    services: ['tinapple-session.service', 'seatd.service', 'pipewire.service'],
    accentColor: '#e5b567',
  },
  {
    id: 'media',
    name: 'Jellyfin Media Appliance',
    category: 'Entertainment',
    icon: 'Film',
    tagline: '4K HDR hardware transcoding & streaming hub',
    description:
      'Zero-bloat media server with VA-API / NVDEC hardware acceleration, DLNA broadcasting, and automated subtitle scraping.',
    installed: true,
    status: 'active',
    services: ['jellyfin.service'],
    accentColor: '#7ec789',
  },
  {
    id: 'downloads',
    name: 'Automated Cloud Downloader',
    category: 'Automation',
    icon: 'DownloadCloud',
    tagline: 'qBittorrent-nox headless & wireguard daemon',
    description:
      'High-throughput web downloader with automated seed ratio limits, RSS feed watching, and hardlinked library sorting.',
    installed: false,
    status: 'uninstalled',
    services: ['qbittorrent-nox@root.service'],
    accentColor: '#e5b567',
  },
  {
    id: 'databases',
    name: 'Enterprise DB Cluster',
    category: 'Databases',
    icon: 'Database',
    tagline: 'PostgreSQL 16, Redis 7 & InfluxDB telemetry store',
    description:
      'Fully tuned database stack with high-write memory caching, timeseries retention policies, and automated daily vacuuming.',
    installed: true,
    status: 'active',
    services: ['postgresql.service', 'redis.service'],
    accentColor: '#7ec789',
  },
  {
    id: 'network',
    name: 'Tailnet Zero-Trust Mesh',
    category: 'Security & Mesh',
    icon: 'ShieldCheck',
    tagline: 'Encrypted WireGuard peer mesh & Subnet Gateway',
    description:
      'Connect securely from anywhere in the world without port-forwarding or public IP exposure. LAN route advertisement enabled.',
    installed: true,
    status: 'active',
    services: ['tailscaled.service'],
    accentColor: '#e5b567',
  },
  {
    id: 'backups',
    name: 'Snapper Immutable Backups',
    category: 'Reliability',
    icon: 'Archive',
    tagline: 'Atomic Btrfs snapshots with instant rollback',
    description:
      'Hourly snapshot timeline with automatic pre/post pacman update snapshots, bootable via Limine/GRUB boot menu.',
    installed: true,
    status: 'active',
    services: ['snapper-timeline.timer', 'snapper-cleanup.timer'],
    accentColor: '#7ec789',
  },
];

export const ChaddyStore: React.FC = () => {
  const [profiles, setProfiles] = useState<ApplianceProfile[]>(DEFAULT_PROFILES);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleToggleInstall = (id: string) => {
    setInstallingId(id);
    setTimeout(() => {
      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const nextInstalled = !p.installed;
            if (nextInstalled) {
              confetti({
                particleCount: 90,
                spread: 75,
                origin: { y: 0.6 },
                colors: ['#e5b567', '#f59e0b', '#7ec789', '#10b981', '#f3f4f6'],
              });
            }
            return {
              ...p,
              installed: nextInstalled,
              status: nextInstalled ? 'active' : 'uninstalled',
            };
          }
          return p;
        })
      );
      setInstallingId(null);
    }, 1200);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Monitor':
        return <Monitor className="w-5 h-5" />;
      case 'Film':
        return <Film className="w-5 h-5" />;
      case 'DownloadCloud':
        return <DownloadCloud className="w-5 h-5" />;
      case 'Database':
        return <Database className="w-5 h-5" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5" />;
      case 'Archive':
        return <Archive className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-tinapple-card/90 via-tinapple-surface/90 to-tinapple-card/90 border border-tinapple-border backdrop-blur-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl font-mono">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 text-xs mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chaddy Store Appliance Profiles</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight font-sans">
            Curated Appliance Stacks in 1-Click
          </h2>
          <p className="text-xs text-tinapple-subtext mt-1.5 leading-relaxed font-sans">
            Install optimized software appliances pre-tuned for the Tinapple OS kernel scheduler and storage subvolumes.
          </p>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {profiles.map((profile) => {
          const isBusy = installingId === profile.id;
          return (
            <SpotlightCard
              key={profile.id}
              className="p-6 flex flex-col justify-between"
              spotlightColor={`${profile.accentColor}20`}
              borderColor={`${profile.accentColor}50`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-2xl border"
                    style={{
                      backgroundColor: `${profile.accentColor}18`,
                      borderColor: `${profile.accentColor}30`,
                      color: profile.accentColor,
                    }}
                  >
                    {getIcon(profile.icon)}
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-full border uppercase ${
                      profile.installed
                        ? 'bg-tinapple-green/10 text-tinapple-green border-tinapple-green/20 font-bold'
                        : 'bg-tinapple-muted/10 text-tinapple-muted border-tinapple-border'
                    }`}
                  >
                    {profile.installed ? 'Installed' : 'Available'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{profile.name}</h3>
                <p className="text-xs font-semibold text-tinapple-gold mt-0.5 font-mono">{profile.tagline}</p>
                <p className="text-xs text-tinapple-subtext mt-2.5 leading-relaxed">
                  {profile.description}
                </p>

                {/* Sub-services list */}
                <div className="mt-4 pt-3 border-t border-tinapple-border/70">
                  <span className="text-[10px] uppercase font-mono text-tinapple-muted tracking-wider block mb-1.5">
                    Managed Units:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.services.map((svc) => (
                      <span
                        key={svc}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-tinapple-dark/80 text-tinapple-text border border-tinapple-border"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Install / Remove Button */}
              <div className="mt-5 pt-3">
                {profile.installed ? (
                  <button
                    disabled={isBusy}
                    onClick={() => handleToggleInstall(profile.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold bg-tinapple-dark/80 hover:bg-tinapple-red/15 text-tinapple-text hover:text-tinapple-red border border-tinapple-border hover:border-tinapple-red/30 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-tinapple-gold" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-tinapple-green" />
                        <span>Active Profile (Uninstall)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <StarBorder
                    as="button"
                    color={profile.accentColor}
                    disabled={isBusy}
                    onClick={() => handleToggleInstall(profile.id)}
                    className="w-full"
                  >
                    {isBusy ? (
                      <span className="flex items-center gap-2 font-mono">
                        <Loader2 className="w-4 h-4 animate-spin text-tinapple-gold" />
                        <span>Configuring profile...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold text-tinapple-gold font-mono">
                        <Plus className="w-4 h-4" />
                        <span>Install Profile</span>
                      </span>
                    )}
                  </StarBorder>
                )}
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </div>
  );
};
export default ChaddyStore;
