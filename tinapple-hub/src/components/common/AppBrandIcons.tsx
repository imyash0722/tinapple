import React from 'react';

export interface BrandConfig {
  name: string;
  iconPath: string;
  accentColor: string;
  isRaster?: boolean;
}

export const APP_BRAND_CONFIG: Record<string, BrandConfig> = {
  jellyfin: {
    name: 'Jellyfin',
    iconPath: '/icons/jellyfin.svg',
    accentColor: '#AA5CC3',
  },
  media: {
    name: 'Jellyfin',
    iconPath: '/icons/jellyfin.svg',
    accentColor: '#AA5CC3',
  },
  qbittorrent: {
    name: 'qBittorrent',
    iconPath: '/icons/qbittorrent.svg',
    accentColor: '#3A75C4',
  },
  downloads: {
    name: 'qBittorrent',
    iconPath: '/icons/qbittorrent.svg',
    accentColor: '#3A75C4',
  },
  metube: {
    name: 'MeTube',
    iconPath: '/icons/youtube.svg',
    accentColor: '#FF0000',
  },
  youtube: {
    name: 'YouTube Downloader',
    iconPath: '/icons/youtube.svg',
    accentColor: '#FF0000',
  },
  suwayomi: {
    name: 'Suwayomi',
    iconPath: '/icons/suwayomi.png',
    accentColor: '#F43F5E',
    isRaster: true,
  },
  'suwayomi-server': {
    name: 'Suwayomi',
    iconPath: '/icons/suwayomi.png',
    accentColor: '#F43F5E',
    isRaster: true,
  },
  navidrome: {
    name: 'Navidrome',
    iconPath: '/icons/navidrome.png',
    accentColor: '#0086D6',
    isRaster: true,
  },
  tailscale: {
    name: 'Tailscale',
    iconPath: '/icons/tailscale.svg',
    accentColor: '#4C72B0',
  },
  network: {
    name: 'Tailscale',
    iconPath: '/icons/tailscale.svg',
    accentColor: '#4C72B0',
  },
  syncthing: {
    name: 'Syncthing',
    iconPath: '/icons/syncthing.svg',
    accentColor: '#148FD2',
  },
  backups: {
    name: 'Syncthing',
    iconPath: '/icons/syncthing.svg',
    accentColor: '#148FD2',
  },
  adguard: {
    name: 'AdGuard Home',
    iconPath: '/icons/adguard.svg',
    accentColor: '#68BC71',
  },
  adguardhome: {
    name: 'AdGuard Home',
    iconPath: '/icons/adguard.svg',
    accentColor: '#68BC71',
  },
  vaultwarden: {
    name: 'Vaultwarden',
    iconPath: '/icons/vaultwarden.svg',
    accentColor: '#175DDC',
  },
  bitwarden: {
    name: 'Vaultwarden',
    iconPath: '/icons/vaultwarden.svg',
    accentColor: '#175DDC',
  },
  minecraft: {
    name: 'Minecraft',
    iconPath: '/icons/minecraft.svg',
    accentColor: '#34D399',
  },
  'minecraft-server': {
    name: 'Minecraft',
    iconPath: '/icons/minecraft.svg',
    accentColor: '#34D399',
  },
  docker: {
    name: 'Docker',
    iconPath: '/icons/docker.svg',
    accentColor: '#2496ED',
  },
  tor: {
    name: 'Tor',
    iconPath: '/icons/tor.svg',
    accentColor: '#7D4698',
  },
  wireguard: {
    name: 'WireGuard',
    iconPath: '/icons/wireguard.svg',
    accentColor: '#88171A',
  },
  niri: {
    name: 'Niri',
    iconPath: '/icons/niri.svg',
    accentColor: '#268BD2',
  },
  desktop: {
    name: 'Niri',
    iconPath: '/icons/niri.svg',
    accentColor: '#268BD2',
  },
  arch: {
    name: 'Arch Linux',
    iconPath: '/icons/archlinux.svg',
    accentColor: '#1793D1',
  },
  base: {
    name: 'Arch Linux',
    iconPath: '/icons/archlinux.svg',
    accentColor: '#1793D1',
  },
  filebrowser: {
    name: 'FileBrowser',
    iconPath: '/icons/filebrowser.png',
    accentColor: '#00A8FF',
    isRaster: true,
  },
  prometheus: {
    name: 'Prometheus',
    iconPath: '/icons/prometheus.svg',
    accentColor: '#E6522C',
  },
  infrastructure: {
    name: 'Prometheus',
    iconPath: '/icons/prometheus.svg',
    accentColor: '#E6522C',
  },
  ollama: {
    name: 'Ollama',
    iconPath: '/icons/ollama.svg',
    accentColor: '#E5B567',
  },
  'ai-neural': {
    name: 'Ollama',
    iconPath: '/icons/ollama.svg',
    accentColor: '#E5B567',
  },
  postgresql: {
    name: 'PostgreSQL',
    iconPath: '/icons/postgresql.svg',
    accentColor: '#4169E1',
  },
  databases: {
    name: 'PostgreSQL',
    iconPath: '/icons/postgresql.svg',
    accentColor: '#4169E1',
  },
  redis: {
    name: 'Redis',
    iconPath: '/icons/redis.svg',
    accentColor: '#DC382D',
  },
  snapper: {
    name: 'Snapper',
    iconPath: '/icons/snapper.svg',
    accentColor: '#73BA25',
  },
  couchdb: {
    name: 'Obsidian LiveSync',
    iconPath: '/icons/couchdb.svg',
    accentColor: '#E03C31',
  },
  radarr: {
    name: 'Radarr',
    iconPath: '/icons/radarr.svg',
    accentColor: '#FFC230',
  },
  sonarr: {
    name: 'Sonarr',
    iconPath: '/icons/sonarr.svg',
    accentColor: '#00C4FF',
  },
  prowlarr: {
    name: 'Prowlarr',
    iconPath: '/icons/prowlarr.svg',
    accentColor: '#F59E0B',
  },
  bazarr: {
    name: 'Bazarr',
    iconPath: '/icons/bazarr.svg',
    accentColor: '#8B5CF6',
  },
  seerr: {
    name: 'Jellyseerr',
    iconPath: '/icons/seerr.svg',
    accentColor: '#6366F1',
  },
  jellyseerr: {
    name: 'Jellyseerr',
    iconPath: '/icons/seerr.svg',
    accentColor: '#6366F1',
  },
  jdownloader: {
    name: 'JDownloader',
    iconPath: '/icons/jdownloader.svg',
    accentColor: '#2563EB',
  },
  jdownloader2: {
    name: 'JDownloader',
    iconPath: '/icons/jdownloader.svg',
    accentColor: '#2563EB',
  },
  syncyomi: {
    name: 'SyncYomi',
    iconPath: '/icons/syncyomi.svg',
    accentColor: '#EC4899',
  },
  playit: {
    name: 'Playit.gg',
    iconPath: '/icons/playit.svg',
    accentColor: '#10B981',
  },
  'playit-gg': {
    name: 'Playit.gg',
    iconPath: '/icons/playit.svg',
    accentColor: '#10B981',
  },
  beeper: {
    name: 'Beeper',
    iconPath: '/icons/beeper.svg',
    accentColor: '#F43F5E',
  },
  bbctl: {
    name: 'Beeper bbctl',
    iconPath: '/icons/beeper.svg',
    accentColor: '#F43F5E',
  },
  protonvpn: {
    name: 'Proton VPN',
    iconPath: '/icons/protonvpn.svg',
    accentColor: '#6D4AFF',
  },
  'proton-vpn': {
    name: 'Proton VPN',
    iconPath: '/icons/protonvpn.svg',
    accentColor: '#6D4AFF',
  },
  proton: {
    name: 'Proton VPN',
    iconPath: '/icons/protonvpn.svg',
    accentColor: '#6D4AFF',
  },
  tailscaled: {
    name: 'Tailscale',
    iconPath: '/icons/tailscale.svg',
    accentColor: '#4C72B0',
  },
  obsidian: {
    name: 'Obsidian LiveSync',
    iconPath: '/icons/couchdb.svg',
    accentColor: '#E03C31',
  },
  'tinapple-session': {
    name: 'Niri',
    iconPath: '/icons/niri.svg',
    accentColor: '#268BD2',
  },
};

interface IconProps {
  id?: string;
  size?: number;
  className?: string;
  showBadge?: boolean;
}

export const AppBrandIcon: React.FC<IconProps> = ({
  id = 'arch',
  size = 48,
  className = '',
  showBadge = false,
}) => {
  const normId = (id || 'arch')
    .toLowerCase()
    .replace(/\.service$/, '')
    .replace(/@.*$/, '')
    .replace(/[._]/g, '-');

  const cfg =
    APP_BRAND_CONFIG[normId] ||
    APP_BRAND_CONFIG[normId.replace(/-server$/, '')] ||
    APP_BRAND_CONFIG[normId.replace(/-headless$/, '')] ||
    APP_BRAND_CONFIG[Object.keys(APP_BRAND_CONFIG).find((k) => normId.includes(k)) || 'arch'] ||
    APP_BRAND_CONFIG.arch;

  if (showBadge) {
    const badgePadding = Math.max(3, Math.round(size * 0.12));
    const roundedClass = size >= 40 ? 'rounded-2xl' : 'rounded-xl';
    return (
      <div
        className={`inline-flex items-center justify-center ${roundedClass} border shrink-0 flex-shrink-0 aspect-square select-none ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          maxWidth: size,
          maxHeight: size,
          backgroundColor: `${cfg.accentColor}18`,
          borderColor: `${cfg.accentColor}40`,
          boxShadow: `0 0 16px ${cfg.accentColor}25`,
        }}
      >
        <img
          src={cfg.iconPath}
          alt={cfg.name}
          style={{
            width: size - badgePadding * 2,
            height: size - badgePadding * 2,
            minWidth: size - badgePadding * 2,
            minHeight: size - badgePadding * 2,
            maxWidth: size - badgePadding * 2,
            maxHeight: size - badgePadding * 2,
          }}
          className="object-contain filter drop-shadow-sm shrink-0 flex-shrink-0 aspect-square"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <img
      src={cfg.iconPath}
      alt={cfg.name}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
      }}
      className={`inline-block object-contain filter drop-shadow-sm shrink-0 flex-shrink-0 aspect-square select-none ${className}`}
      loading="lazy"
    />
  );
};

export const JellyfinIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="jellyfin" {...props} />
);

export const QBittorrentIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="qbittorrent" {...props} />
);

export const SuwayomiIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="suwayomi" {...props} />
);

export const NavidromeIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="navidrome" {...props} />
);

export const TailscaleIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="tailscale" {...props} />
);

export const SyncthingIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="syncthing" {...props} />
);

export const AdGuardIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="adguard" {...props} />
);

export const VaultwardenIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="vaultwarden" {...props} />
);

export const MinecraftIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="minecraft" {...props} />
);

export const DockerIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="docker" {...props} />
);

export const TorIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="tor" {...props} />
);

export const WireGuardIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="wireguard" {...props} />
);

export const NiriIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="niri" {...props} />
);

export const ArchLinuxIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="arch" {...props} />
);

export const PrometheusIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="prometheus" {...props} />
);

export const FileBrowserIcon: React.FC<{ size?: number; className?: string }> = (props) => (
  <AppBrandIcon id="filebrowser" {...props} />
);

export default AppBrandIcon;
