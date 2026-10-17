import React, { useState, useMemo } from 'react';
import {
  Monitor,
  Film,
  DownloadCloud,
  Database,
  ShieldCheck,
  Archive,
  Cpu,
  Check,
  Plus,
  Loader2,
  Sparkles,
  Layers,
  ArrowRight,
  Rotate3d,
  LayoutGrid,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import CircularCarousel, { CircularCarouselItem } from '../reactbits/CircularCarousel';
import HoldButton from '../reactbits/HoldButton';
import TechText from '../reactbits/TechText';
import { generateProfileCardSvg } from '../../utils/profileCards';
import { ApplianceProfile } from '../../types/api';

const GLYPHS: Record<string, string> = {
  desktop: `<rect x="-24" y="-18" width="48" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="-12" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="2"/><line x1="-24" y1="-2" x2="24" y2="-2" stroke="currentColor" stroke-width="1.5"/><line x1="0" y1="-2" x2="0" y2="14" stroke="currentColor" stroke-width="1.5"/>`,
  media: `<polygon points="-10,-18 20,0 -10,18" fill="currentColor"/><circle cx="0" cy="0" r="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"/>`,
  downloads: `<path d="M0 -20 V12 M-12 0 L0 12 L12 0" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M-22 18 H22" stroke="currentColor" stroke-width="2.5"/>`,
  databases: `<ellipse cx="0" cy="-14" rx="22" ry="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-22 -14 V0 C-22 5 22 5 22 0 V-14 M-22 0 V14 C-22 19 22 19 22 14 V0" fill="none" stroke="currentColor" stroke-width="2"/>`,
  network: `<polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="0" cy="0" r="6" fill="currentColor"/>`,
  backups: `<path d="M-18 0 A18 18 0 1 1 14 12" fill="none" stroke="currentColor" stroke-width="2.5"/><polyline points="10,18 14,12 18,16" stroke="currentColor" stroke-width="2" fill="none"/>`,
  'ai-neural': `<circle cx="-14" cy="-14" r="5" fill="currentColor"/><circle cx="14" cy="-14" r="5" fill="currentColor"/><circle cx="0" cy="14" r="6" fill="currentColor"/><line x1="-14" y1="-14" x2="0" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="-14" x2="0" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="-14" y1="-14" x2="14" y2="-14" stroke="currentColor" stroke-width="1.5"/>`,
};

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
  {
    id: 'ai-neural',
    name: 'Local AI & LLM Engine',
    category: 'Neural Compute',
    icon: 'Cpu',
    tagline: 'Ollama, Whisper & Vulkan GPU acceleration',
    description:
      'On-device neural inference runner optimized for AMD ROCm and Intel Vulkan compute with zero telemetry phoning home.',
    installed: false,
    status: 'uninstalled',
    services: ['ollama.service'],
    accentColor: '#e5b567',
  },
];

export const ChaddyStore: React.FC = () => {
  const [profiles, setProfiles] = useState<ApplianceProfile[]>(DEFAULT_PROFILES);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const selectedProfile = profiles[selectedIndex] || profiles[0];

  const carouselItems: CircularCarouselItem[] = useMemo(() => {
    return profiles.map((p) => {
      const rawGlyph = GLYPHS[p.id] || GLYPHS.desktop;
      const glyph = rawGlyph.replace(/currentColor/g, p.accentColor);
      return {
        src: generateProfileCardSvg({
          id: p.id,
          name: p.name,
          category: p.category,
          tagline: p.tagline,
          accentColor: p.accentColor,
          installed: p.installed,
          glyph,
        }),
        title: p.name,
        subtitle: p.tagline,
        alt: p.name,
      };
    });
  }, [profiles]);

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
    }, 600);
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
      case 'Cpu':
        return <Cpu className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Blueprint TechText & View Switcher */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-tinapple-card/90 via-tinapple-surface/90 to-tinapple-card/90 border border-tinapple-border backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 text-xs mb-3 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chaddy Store Appliance Profiles</span>
          </div>

          <div className="h-8 w-80 mb-1">
            <TechText
              text="CHADDY APPLIANCE STACKS"
              fontSize={18}
              fontWeight={900}
              color="#ffffff"
              accentColor="#e5b567"
              labels={true}
              guides={true}
              intro="assemble"
              clickKick={true}
            />
          </div>

          <p className="text-xs text-tinapple-subtext leading-relaxed font-sans mt-1">
            Browse and deploy pre-tuned software appliances optimized for the Tinapple kernel scheduler and Btrfs subvolumes.
          </p>
        </div>

        {/* View Mode Switcher: 3D Cylinder vs Grid */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-tinapple-dark/90 border border-tinapple-border self-start md:self-center">
          <button
            onClick={() => setViewMode('carousel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              viewMode === 'carousel'
                ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                : 'text-tinapple-subtext hover:text-white'
            }`}
          >
            <Rotate3d className="w-4 h-4" />
            <span>3D Cylinder</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                : 'text-tinapple-subtext hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Bento Grid</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 3D CYLINDRICAL CAROUSEL VIEW */}
      {viewMode === 'carousel' && (
        <div className="space-y-6">
          {/* Circular Carousel Stage */}
          <div className="relative h-[380px] w-full rounded-2xl bg-tinapple-card/60 border border-tinapple-border overflow-hidden p-4 backdrop-blur-xl">
            <CircularCarousel
              items={carouselItems}
              preset="cylinder"
              cardWidth={210}
              aspectRatio={1.28}
              curve={55}
              draggable={true}
              snap={true}
              autoplay="drift"
              speed={0.4}
              pauseOnHover={true}
              captions={true}
              fadeColor="#060709"
              onChange={(idx) => setSelectedIndex(idx)}
              onItemClick={(_, idx) => setSelectedIndex(idx)}
              className="h-full w-full"
            />
            {/* Quick Helper Badge */}
            <div className="absolute top-4 left-4 pointer-events-none text-[10px] font-mono text-tinapple-muted flex items-center gap-2 bg-tinapple-dark/80 px-2.5 py-1 rounded-md border border-tinapple-border">
              <span>● DRAG TO ROTATE 3D STACK</span>
              <span>• CLICK TO INSPECT</span>
            </div>
          </div>

          {/* Selected Appliance Detail Deck with HoldButton Action */}
          <SpotlightCard
            className="p-6 border border-tinapple-border"
            spotlightColor={`${selectedProfile.accentColor}25`}
            borderColor={`${selectedProfile.accentColor}55`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-2xl border"
                    style={{
                      backgroundColor: `${selectedProfile.accentColor}18`,
                      borderColor: `${selectedProfile.accentColor}30`,
                      color: selectedProfile.accentColor,
                    }}
                  >
                    {getIcon(selectedProfile.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-tinapple-surface border border-tinapple-border text-tinapple-gold font-bold">
                        {selectedProfile.category.toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase ${
                          selectedProfile.installed
                            ? 'bg-tinapple-green/10 text-tinapple-green border-tinapple-green/20 font-bold'
                            : 'bg-tinapple-muted/10 text-tinapple-muted border-tinapple-border'
                        }`}
                      >
                        {selectedProfile.installed ? 'Installed & Active' : 'Available'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                      {selectedProfile.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs font-semibold text-tinapple-gold font-mono">
                  {selectedProfile.tagline}
                </p>
                <p className="text-xs text-tinapple-subtext leading-relaxed">
                  {selectedProfile.description}
                </p>

                {/* Sub-services / units managed */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-mono text-tinapple-muted tracking-wider block mb-1.5">
                    Managed System Units:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfile.services.map((svc) => (
                      <span
                        key={svc}
                        className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-tinapple-dark/90 text-tinapple-text border border-tinapple-border flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-tinapple-green" />
                        <span>{svc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* HoldButton Safety Installation Confirmation */}
              <div className="flex flex-col items-start lg:items-end justify-center gap-2.5 border-t lg:border-t-0 lg:border-l border-tinapple-border/70 pt-4 lg:pt-0 lg:pl-6 min-w-[240px]">
                <span className="text-[10px] font-mono text-tinapple-muted uppercase tracking-wider">
                  Action Confirmation
                </span>

                {selectedProfile.installed ? (
                  <HoldButton
                    backgroundColor="#15181f"
                    fillColor="#ef4444"
                    textColor="#f87171"
                    fillTextColor="#ffffff"
                    size="md"
                    holdTime={1600}
                    wave={true}
                    glow={true}
                    doneLabel="Profile Uninstalled"
                    onHold={() => handleToggleInstall(selectedProfile.id)}
                    className="w-full font-mono text-xs font-bold"
                  >
                    Hold to Uninstall Profile
                  </HoldButton>
                ) : (
                  <HoldButton
                    backgroundColor="#15181f"
                    fillColor="#e5b567"
                    textColor="#e5b567"
                    fillTextColor="#060709"
                    size="md"
                    holdTime={1400}
                    wave={true}
                    glow={true}
                    doneLabel="Profile Deployed!"
                    onHold={() => handleToggleInstall(selectedProfile.id)}
                    className="w-full font-mono text-xs font-bold"
                  >
                    Hold to Deploy Profile
                  </HoldButton>
                )}

                <span className="text-[10px] font-mono text-tinapple-muted text-center w-full">
                  Press and hold for 1.4s to confirm
                </span>
              </div>
            </div>
          </SpotlightCard>
        </div>
      )}

      {/* VIEW 2: BENTO GRID VIEW WITH HOLDBUTTON */}
      {viewMode === 'grid' && (
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

                {/* HoldButton in Grid */}
                <div className="mt-5 pt-3">
                  {profile.installed ? (
                    <HoldButton
                      backgroundColor="#15181f"
                      fillColor="#ef4444"
                      textColor="#f87171"
                      fillTextColor="#ffffff"
                      size="sm"
                      holdTime={1500}
                      wave={true}
                      glow={true}
                      doneLabel="Uninstalled"
                      onHold={() => handleToggleInstall(profile.id)}
                      className="w-full font-mono text-xs font-bold"
                    >
                      Hold to Uninstall
                    </HoldButton>
                  ) : (
                    <HoldButton
                      backgroundColor="#15181f"
                      fillColor={profile.accentColor}
                      textColor={profile.accentColor}
                      fillTextColor="#060709"
                      size="sm"
                      holdTime={1400}
                      wave={true}
                      glow={true}
                      doneLabel="Installed!"
                      onHold={() => handleToggleInstall(profile.id)}
                      className="w-full font-mono text-xs font-bold"
                    >
                      Hold to Install
                    </HoldButton>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default ChaddyStore;
