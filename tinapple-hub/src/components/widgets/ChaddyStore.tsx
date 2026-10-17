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
      'Ultra-responsive wlroots environment with ChadWM, Alacritty, Foot, PipeWire sound, and custom Ryoku Tokyo-Night theme.',
    installed: true,
    status: 'active',
    services: ['tinapple-session.service', 'seatd.service', 'pipewire.service'],
    accentColor: '#7aa2f7',
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
    accentColor: '#bb9af7',
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
    accentColor: '#7dcfff',
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
    accentColor: '#ff9e64',
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
    accentColor: '#73daca',
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
    accentColor: '#e0af68',
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
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#7aa2f7', '#7dcfff', '#bb9af7', '#73daca'],
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
        return <Monitor className="w-6 h-6" />;
      case 'Film':
        return <Film className="w-6 h-6" />;
      case 'DownloadCloud':
        return <DownloadCloud className="w-6 h-6" />;
      case 'Database':
        return <Database className="w-6 h-6" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6" />;
      case 'Archive':
        return <Archive className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-tinapple-card/90 via-tinapple-surface/80 to-tinapple-card/90 border border-tinapple-border backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tinapple-blue/15 text-tinapple-cyan border border-tinapple-blue/20 text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chaddy Store Appliance Profiles</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Turn your appliance into any workstation or server in 1-click
          </h2>
          <p className="text-xs text-tinapple-subtext mt-1.5 leading-relaxed">
            Install curated, pre-configured software stacks tailored for Tinapple Appliance OS. Each profile configures systemd daemons, firewall rules, and performance tuners automatically.
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
              className="p-5 flex flex-col justify-between"
              spotlightColor={`${profile.accentColor}25`}
              borderColor={`${profile.accentColor}60`}
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
                        ? 'bg-tinapple-green/10 text-tinapple-green border-tinapple-green/20'
                        : 'bg-tinapple-muted/10 text-tinapple-muted border-tinapple-border'
                    }`}
                  >
                    {profile.installed ? 'Installed' : 'Available'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{profile.name}</h3>
                <p className="text-xs font-medium text-tinapple-cyan mt-0.5">{profile.tagline}</p>
                <p className="text-xs text-tinapple-subtext mt-2.5 leading-relaxed">
                  {profile.description}
                </p>

                {/* Sub-services list */}
                <div className="mt-4 pt-3 border-t border-tinapple-border/50">
                  <span className="text-[10px] uppercase font-mono text-tinapple-muted tracking-wider block mb-1.5">
                    Managed Units:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {profile.services.map((svc) => (
                      <span
                        key={svc}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-tinapple-dark/60 text-tinapple-text border border-tinapple-border"
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
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-tinapple-dark/80 hover:bg-tinapple-red/15 text-tinapple-text hover:text-tinapple-red border border-tinapple-border hover:border-tinapple-red/30 transition-all disabled:opacity-50"
                  >
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-tinapple-cyan" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-tinapple-green" />
                        <span>Active (Click to Remove)</span>
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
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Configuring profile...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-semibold text-tinapple-cyan">
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
