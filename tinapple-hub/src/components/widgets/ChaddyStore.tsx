import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Zap,
  Layers,
  LayoutGrid,
  Play,
  Square,
  RotateCw,
  ExternalLink,
  Settings,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  X,
  Save,
  Loader2,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { ShinyText } from '../reactbits/ShinyText';
import { StarBorder } from '../reactbits/StarBorder';
import CircularCarousel, { CircularCarouselItem } from '../reactbits/CircularCarousel';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { api, getServiceUrl } from '../../services/api';
import { AppInfo, AppliancePackStatus } from '../../types/api';
import { StoreTerminal } from './StoreTerminal';

const FALLBACK_APPS: AppInfo[] = [
  {
    id: 'jellyfin',
    name: 'Jellyfin Media Server',
    tagline: 'Self-hosted privacy-first streaming server',
    description: 'Free Software media system for streaming movies, series, music, and live TV with hardware transcoding.',
    category: 'media',
    package: 'jellyfin-server',
    unit: 'jellyfin.service',
    binary: 'jellyfin',
    port: 8096,
    icon: 'jellyfin',
    accentColor: '#AA5CC3',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent Headless',
    tagline: 'High-performance torrent engine with WebUI',
    description: 'Feature-rich BitTorrent client running headless with clean Web UI, automated categories, and RSS.',
    category: 'downloads',
    package: 'qbittorrent-nox',
    unit: 'qbittorrent-nox.service',
    binary: 'qbittorrent-nox',
    port: 8080,
    icon: 'qbittorrent',
    accentColor: '#3A75C4',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'homarr',
    name: 'Homarr Dashboard Engine',
    tagline: 'Customizable homelab dashboard & app portal',
    description: 'Upstream Homarr dashboard engine with real-time service integrations, ping status, torrent/media widgets, and multi-user authentication.',
    category: 'system',
    package: 'homarr',
    unit: 'homarr.service',
    binary: 'docker',
    port: 7575,
    icon: 'homarr',
    accentColor: '#E65100',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'pinchflat',
    name: 'Pinchflat YouTube Manager',
    tagline: 'Automated YouTube channel archiver & Jellyfin media sync',
    description: 'Automated YouTube channel and playlist manager with Kodi/Jellyfin NFO metadata, SponsorBlock integration, chapter markers, and automatic media library indexing.',
    category: 'media',
    package: 'pinchflat',
    unit: 'pinchflat.service',
    binary: 'docker',
    port: 8945,
    icon: 'youtube',
    accentColor: '#FF0000',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'suwayomi',
    name: 'Suwayomi Manga Server',
    tagline: 'Keiyoushi extension hub & Mihon sync',
    description: 'Self-hosted manga streaming and offline sync server with Keiyoushi source extensions and Tachidesk WebUI.',
    category: 'media',
    package: 'suwayomi-server',
    unit: 'suwayomi-server.service',
    binary: 'suwayomi-server',
    port: 4567,
    icon: 'suwayomi',
    accentColor: '#F43F5E',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'navidrome',
    name: 'Navidrome Music Server',
    tagline: 'Modern Subsonic-compatible audio streamer',
    description: 'Lightweight, fast, and modern music server and streamer with full Subsonic API compatibility.',
    category: 'media',
    package: 'navidrome',
    unit: 'navidrome.service',
    binary: 'navidrome',
    port: 4533,
    icon: 'navidrome',
    accentColor: '#0086D6',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'tailscale',
    name: 'Tailscale Mesh VPN',
    tagline: 'Encrypted WireGuard peer network & subnet router',
    description: 'Zero-config WireGuard mesh network connecting your homelab devices securely from anywhere without port forwarding.',
    category: 'network',
    package: 'tailscale',
    unit: 'tailscaled.service',
    binary: 'tailscaled',
    port: 0,
    icon: 'tailscale',
    accentColor: '#4C72B0',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'syncthing',
    name: 'Syncthing Decentralized Sync',
    tagline: 'Continuous peer-to-peer folder replication',
    description: 'Continuous peer-to-peer decentralized file synchronization protecting your photos, documents, and backups.',
    category: 'backups',
    package: 'syncthing',
    unit: 'syncthing@pineapple.service',
    binary: 'syncthing',
    port: 8384,
    icon: 'syncthing',
    accentColor: '#148FD2',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'samba',
    name: 'Samba SMB Storage Server',
    tagline: 'Enterprise LAN file sharing for Windows, Mac & Linux',
    description: 'High-performance SMB/CIFS network storage sharing /srv/storage datasets across local home network.',
    category: 'storage',
    package: 'samba',
    unit: 'smb.service',
    binary: 'smbd',
    port: 445,
    icon: 'folder',
    accentColor: '#0EA5E9',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'adguard',
    name: 'AdGuard Home DNS',
    tagline: 'Network-wide tracking & ad blocker',
    description: 'Network-wide ad-blocking and privacy protection DNS server with DNS-over-HTTPS and parental controls.',
    category: 'network',
    package: 'adguardhome',
    unit: 'adguardhome.service',
    binary: 'adguardhome',
    port: 3000,
    icon: 'adguard',
    accentColor: '#68BC71',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'vaultwarden',
    name: 'Vaultwarden Password Vault',
    tagline: 'Self-hosted end-to-end encrypted password vault',
    description: 'Lightweight Bitwarden-compatible API server written in Rust for managing secure logins, keys, and 2FA secrets.',
    category: 'security',
    package: 'vaultwarden',
    unit: 'vaultwarden.service',
    binary: 'vaultwarden',
    port: 8000,
    icon: 'vaultwarden',
    accentColor: '#175DDC',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'minecraft',
    name: 'Minecraft Gaming Appliance',
    tagline: 'PaperMC server & Playit.gg Anycast domain tunnel',
    description: 'High-tickrate PaperMC server with Aikar GC memory optimization, Anycast domain tunnel, and Crafty 4 support.',
    category: 'gaming',
    package: 'jre17-openjdk-headless',
    unit: 'minecraft-server.service',
    binary: 'minecraft-server',
    port: 25565,
    icon: 'minecraft',
    accentColor: '#34D399',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'docker',
    name: 'Docker Container Engine',
    tagline: 'OCI container runtime & compose engine',
    description: 'Enterprise container runtime engine and Compose orchestrator for running third-party homelab services.',
    category: 'system',
    package: 'docker',
    unit: 'docker.service',
    binary: 'dockerd',
    port: 0,
    icon: 'docker',
    accentColor: '#2496ED',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'niri',
    name: 'Niri Wayland Desktop',
    tagline: 'Modern scrollable tiling Wayland session',
    description: 'Scrollable tiling Wayland compositor with Waybar status integration and hardware acceleration.',
    category: 'desktop',
    package: 'niri',
    unit: 'tinapple-session.service',
    binary: 'niri',
    port: 0,
    icon: 'niri',
    accentColor: '#268BD2',
    installed: true,
    running: false,
    status: 'stopped',
  },
  {
    id: 'playit',
    name: 'Playit.gg Anycast Tunnel',
    tagline: 'Anycast public tunnel for Minecraft & servers',
    description: 'Global Anycast mesh tunnel providing public domains for Minecraft and homelab services without port forwarding.',
    category: 'network',
    package: 'playit',
    unit: 'playit.service',
    binary: 'playit',
    port: 0,
    icon: 'playit',
    accentColor: '#10B981',
    installed: true,
    running: false,
    status: 'stopped',
  },
  {
    id: 'filebrowser',
    name: 'FileBrowser Quantum',
    tagline: 'Web-based file manager and cloud portal',
    description: 'Modern web file manager with integrated document viewing, media streaming, and upload management.',
    category: 'storage',
    package: 'filebrowser',
    unit: 'filebrowser.service',
    binary: 'filebrowser',
    port: 8081,
    icon: 'filebrowser',
    accentColor: '#10B981',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'couchdb',
    name: 'Obsidian LiveSync CouchDB',
    tagline: 'E2EE sync backend for Obsidian notes',
    description: 'End-to-end encrypted synchronization database backend for Obsidian markdown vaults.',
    category: 'storage',
    package: 'couchdb',
    unit: 'couchdb.service',
    binary: 'couchdb',
    port: 5984,
    icon: 'couchdb',
    accentColor: '#E03C31',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'radarr',
    name: 'Radarr Movie Automator',
    tagline: 'Automated movie manager & grabber',
    description: 'Automated movie collection manager, quality profiler, and BitTorrent/Usenet download orchestrator.',
    category: 'automation',
    package: 'radarr',
    unit: 'radarr.service',
    binary: 'radarr',
    port: 7878,
    icon: 'radarr',
    accentColor: '#FFC230',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'sonarr',
    name: 'Sonarr TV Series Automator',
    tagline: 'Smart PVR for TV series & anime',
    description: 'Automated TV show collection manager, episode tracker, and download orchestrator.',
    category: 'automation',
    package: 'sonarr',
    unit: 'sonarr.service',
    binary: 'sonarr',
    port: 8989,
    icon: 'sonarr',
    accentColor: '#00C4FF',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'prowlarr',
    name: 'Prowlarr Indexer Proxy',
    tagline: 'Torrent indexer & tracker sync engine',
    description: 'Unified torrent indexer and Usenet tracker proxy integrating seamlessly with Radarr and Sonarr.',
    category: 'automation',
    package: 'prowlarr',
    unit: 'prowlarr.service',
    binary: 'prowlarr',
    port: 9696,
    icon: 'prowlarr',
    accentColor: '#F59E0B',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'bazarr',
    name: 'Bazarr Subtitle Manager',
    tagline: 'Automated multilingual subtitle manager',
    description: 'Companion subtitle fetcher for Sonarr and Radarr across dozens of multi-language subtitle providers.',
    category: 'automation',
    package: 'bazarr',
    unit: 'bazarr.service',
    binary: 'bazarr',
    port: 6767,
    icon: 'bazarr',
    accentColor: '#8B5CF6',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'seerr',
    name: 'Seerr Media Discovery & Requests',
    tagline: 'Media request & discovery platform for Jellyfin',
    description: 'Clean media request and discovery portal for Jellyfin with integrated user management.',
    category: 'media',
    package: 'seerr',
    unit: 'seerr.service',
    binary: 'seerr',
    port: 5055,
    icon: 'seerr',
    accentColor: '#6366F1',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'jdownloader',
    name: 'JDownloader 2 Headless',
    tagline: 'Universal download manager via MyJDownloader',
    description: 'Headless direct-download manager supporting 1000+ hosters, cloud storage, and MyJDownloader cloud control.',
    category: 'downloads',
    package: 'jdownloader2',
    unit: 'jdownloader.service',
    binary: 'jdownloader',
    port: 0,
    icon: 'jdownloader',
    accentColor: '#2563EB',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'syncyomi',
    name: 'SyncYomi Manga Sync',
    tagline: 'Tachiyomi, Mihon & Suwayomi reading progress sync',
    description: 'Progress synchronization bridge between Tachiyomi, Mihon, and Suwayomi server.',
    category: 'media',
    package: 'syncyomi',
    unit: 'syncyomi.service',
    binary: 'syncyomi',
    port: 8282,
    icon: 'syncyomi',
    accentColor: '#EC4899',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'beeper',
    name: 'Beeper Matrix Chat Bridges',
    tagline: 'Self-hosted multi-network Matrix chat bridges',
    description: 'Self-hosted Matrix chat bridges connecting WhatsApp, Telegram, Signal, Discord, and iMessage.',
    category: 'network',
    package: 'bbctl',
    unit: 'bbctl.service',
    binary: 'bbctl',
    port: 0,
    icon: 'beeper',
    accentColor: '#F43F5E',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'tor',
    name: 'Tor Onion Router',
    tagline: 'Anonymity proxy network daemon',
    description: 'Decentralized privacy routing daemon with SOCKS5 proxy and onion hidden services.',
    category: 'security',
    package: 'tor',
    unit: 'tor.service',
    binary: 'tor',
    port: 9050,
    icon: 'tor',
    accentColor: '#7D4698',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'protonvpn',
    name: 'Proton VPN Headless Client',
    tagline: 'High-speed Swiss WireGuard & OpenVPN tunnel',
    description: 'High-speed Swiss encrypted WireGuard & OpenVPN tunnel with NetShield tracking/ad-blocker and DNS leak protection.',
    category: 'network',
    package: 'proton-vpn-cli',
    unit: 'proton-vpn-daemon.service',
    binary: 'protonvpn-cli',
    port: 0,
    icon: 'protonvpn',
    accentColor: '#6D4AFF',
    installed: false,
    running: false,
    status: 'not_installed',
  },
];

const FALLBACK_PACKS: AppliancePackStatus[] = [
  {
    id: 'seerr-stack',
    name: 'Ultimate Streaming & Servarr Stack',
    tagline: 'Zero-touch 4K/1080p streaming cloud with automated discovery',
    description: 'Complete media automation stack featuring Jellyfin streaming server, Jellyseerr discovery and user requests portal, Radarr & Sonarr automated indexers via Prowlarr, Bazarr subtitle synchronization, qBittorrent engine, and Pinchflat YouTube manager.',
    badge: 'STREAMING & MEDIA',
    accentColor: '#AA5CC3',
    icon: 'seerr',
    apps: ['jellyfin', 'seerr', 'radarr', 'sonarr', 'prowlarr', 'bazarr', 'qbittorrent', 'pinchflat'],
    features: [
      'Automated root libraries in /srv/media/{movies,shows,youtube}',
      'qBittorrent client authenticated and synced (:8080)',
      'Prowlarr public trackers (YTS, Nyaa, TPB, LimeTorrents) linked',
      'Bazarr multi-language subtitle automator connected',
      'Jellyseerr 1-click requests linked to Jellyfin & Servarrs (:5055)',
      'Pinchflat automated YouTube manager with Jellyfin NFO tags (:8945)',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 8,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'manga-suite',
    name: 'Manga Infinite Library (Suwayomi + Tsumiru)',
    tagline: 'Self-hosted manga streaming with native Web & Tsumiru client',
    description: 'Decentralized manga, comic, and webtoon streaming hub powered by Suwayomi Server with 1,000+ Keiyoushi source extensions, native desktop WebUI, and direct native integration for the Suwayomi-Tsumiru phone client. Real-time server-side synchronization with zero extra bridges needed.',
    badge: 'MANGA & COMICS',
    accentColor: '#F43F5E',
    icon: 'suwayomi',
    apps: ['suwayomi'],
    features: [
      '1,000+ Keiyoushi manga source extensions enabled',
      'Local library storage in /srv/media/manga',
      'Native Suwayomi WebUI for desktop (:4567)',
      'Native Tsumiru client APK for mobile with direct server sync',
      'Zero-overhead direct SQLite server synchronization',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 1,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'manga-syncyomi',
    name: 'Manga & Mihon Sync Bridge (Suwayomi + SyncYomi)',
    tagline: 'Suwayomi manga server paired with SyncYomi cross-device bridge',
    description: 'Complete manga ecosystem featuring Suwayomi server with 1,000+ Keiyoushi extensions, paired with SyncYomi synchronization bridge for external standalone readers (Mihon, TachiyomiJ2K, TachiyomiSY, and Kuukiyomi).',
    badge: 'MIHON & SYNC',
    accentColor: '#EC4899',
    icon: 'syncyomi',
    apps: ['suwayomi', 'syncyomi'],
    features: [
      'Suwayomi manga server with Keiyoushi extension repository (:4567)',
      'SyncYomi multi-device sync bridge for standalone Mihon/Tachiyomi (:8282)',
      'Local library storage in /srv/media/manga',
      'Cross-device reading progress sync for offline mobile readers',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 2,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'privacy-shield',
    name: 'Mesh Privacy & Perimeter Shield',
    tagline: 'Zero-trust encrypted VPN mesh, ad-blocking DNS & Tor routing',
    description: 'All-in-one homelab network defense: Tailscale WireGuard mesh for secure remote access without port forwarding, AdGuard Home for network-wide ad & tracker blocking, Proton VPN encrypted egress tunnel, and Tor onion proxy.',
    badge: 'SECURITY & MESH',
    accentColor: '#00D26A',
    icon: 'adguard',
    apps: ['tailscale', 'adguard', 'protonvpn', 'tor'],
    features: [
      'Tailscale zero-config WireGuard mesh access',
      'AdGuard Home DNS-over-HTTPS & tracker blocking (:3000)',
      'Tor anonymous SOCKS5 onion proxy (:9050)',
      'Proton VPN high-speed egress encryption',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 4,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'audiophile-cloud',
    name: 'Audiophile Music Cloud & Downloader',
    tagline: 'Lossless Subsonic audio streaming & offline YouTube archiver',
    description: 'Modern high-fidelity music streaming server compatible with Symfonium, Feishin, and Substreamer, integrated with Pinchflat for scheduled archiving of YouTube Music tracks, albums, and audio feeds.',
    badge: 'MUSIC & AUDIO',
    accentColor: '#FF7F00',
    icon: 'navidrome',
    apps: ['navidrome', 'pinchflat'],
    features: [
      'Subsonic & Airsonic REST API support for mobile & desktop players',
      'Storage in /srv/media/music with automated library scanning',
      'Pinchflat YouTube & audio channel archiver (:8945)',
      'On-the-fly FLAC/Opus/MP3 transcoding',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 2,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'cloud-vault',
    name: 'Cloud Vault & Resilient Backups',
    tagline: 'Encrypted password manager, P2P sync & web file manager',
    description: 'Self-hosted digital sovereignty suite: Vaultwarden lightweight Bitwarden vault, Syncthing peer-to-peer decentralized file sync for laptops and phones, and FileBrowser Quantum web file explorer.',
    badge: 'VAULT & SYNC',
    accentColor: '#3B82F6',
    icon: 'vaultwarden',
    apps: ['vaultwarden', 'syncthing', 'filebrowser'],
    features: [
      'Bitwarden client compatibility (passwords, 2FA, passkeys)',
      'Syncthing continuous peer-to-peer real-time folder sync (:8384)',
      'FileBrowser web manager with audio, video, & document preview (:8082)',
      'Zero reliance on third-party cloud servers',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 3,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'second-brain',
    name: 'Second Brain & Knowledge Base',
    tagline: 'Real-time encrypted Obsidian LiveSync & markdown explorer',
    description: 'Self-hosted backend for Obsidian knowledge bases. CouchDB provides end-to-end encrypted real-time note synchronization across iOS, Android, and PC, alongside FileBrowser Quantum for remote document editing and backup.',
    badge: 'KNOWLEDGE & NOTES',
    accentColor: '#8B5CF6',
    icon: 'couchdb',
    apps: ['couchdb', 'filebrowser'],
    features: [
      'CouchDB multi-master replication with CORS enabled (:5984)',
      'Zero-subscription Obsidian LiveSync support',
      'Instant conflict resolution and revision tracking',
      'Searchable markdown document vault',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 2,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'gaming-anvil',
    name: 'Gaming Appliance & Anycast Tunnel',
    tagline: 'High-tickrate PaperMC server with instant public Playit tunnel',
    description: 'Enterprise-tuned Minecraft server using PaperMC with Aikar\'s optimized JVM garbage collection parameters, paired with Playit.gg Anycast agent to give friends public join domains without port forwarding.',
    badge: 'GAMING & CLOUD',
    accentColor: '#10B981',
    icon: 'minecraft',
    apps: ['minecraft', 'playit'],
    features: [
      'PaperMC high-performance server runtime (:25565)',
      'Aikar\'s optimized garbage collection GC flags pre-configured',
      'Playit.gg Anycast tunnel with custom public domain',
      'Automated crash recovery & systemd supervision',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 2,
    allInstalled: false,
    allRunning: false,
  },
  {
    id: 'truenas-vault',
    name: 'TrueNAS & Syncthing Storage Vault',
    tagline: 'Enterprise-grade ZFS NAS datasets, Samba LAN shares & Syncthing multi-OS sync',
    description: 'Transform your Tinapple appliance into a high-capacity TrueNAS-style vault. Pre-configures datasets in /srv/storage/{shared,media,backups}, enables Samba SMB network shares for Windows/macOS Explorer, and tunes Syncthing with ignorePerms for conflict-free bi-directional sync.',
    badge: 'STORAGE & NAS',
    accentColor: '#0EA5E9',
    icon: 'syncthing',
    apps: ['syncthing', 'samba', 'filebrowser'],
    features: [
      'Pre-tuned Syncthing with ignorePerms=true (eliminates NTFS/POSIX permission collisions)',
      'Samba SMB shares for \\\\tinapple\\shared on LAN (:445)',
      'FileBrowser Quantum modern web file explorer (:8082)',
      'Dedicated storage hierarchy at /srv/storage with group permissions',
      'Self-contained automated pairing script (/pair.sh) for client devices',
    ],
    installedCount: 0,
    runningCount: 0,
    totalCount: 3,
    allInstalled: false,
    allRunning: false,
  },
];

interface ChaddyStoreProps {
  onOpenGuide?: (guideId: string) => void;
  onOpenSettings?: (appId: string, appName?: string) => void;
  isAdmin?: boolean;
}

export const ChaddyStore: React.FC<ChaddyStoreProps> = ({
  onOpenGuide,
  onOpenSettings,
  isAdmin = true,
}) => {
  const [storeTab, setStoreTab] = useState<'packs' | 'apps'>('packs');
  const [apps, setApps] = useState<AppInfo[]>(FALLBACK_APPS);
  const [packs, setPacks] = useState<AppliancePackStatus[]>(FALLBACK_PACKS);
  const [hasLoadedPacks, setHasLoadedPacks] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('grid');
  const [loadingAction, setLoadingAction] = useState<Record<string, string>>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Config modal state
  const [configModalApp, setConfigModalApp] = useState<AppInfo | null>(null);
  const [editPort, setEditPort] = useState<number>(0);
  const [rawConfigPreview, setRawConfigPreview] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [actionError, setActionError] = useState<{ id: string; name?: string; message: string } | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      const list = await api.getApps();
      if (list && list.length > 0) {
        setApps(list);
      }
    } catch (e) {
      console.warn('Failed to fetch apps:', e);
    }
  }, []);

  const fetchPacks = useCallback(async () => {
    try {
      const list = await api.getPacks();
      if (list && list.length > 0) {
        setPacks(list);
        setHasLoadedPacks(true);
      }
    } catch (e) {
      console.warn('Failed to fetch packs:', e);
    }
  }, []);

  useEffect(() => {
    fetchApps();
    fetchPacks();
    const timer = setInterval(() => {
      fetchApps();
      fetchPacks();
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchApps, fetchPacks]);

  const computedPacks = useMemo(() => {
    return packs.map((pack) => {
      // Prioritize live appsStatus directly populated from systemd by the server backend
      const packApps: AppInfo[] = pack.apps.map((appId) => {
        const fromPack = pack.appsStatus?.find((a) => a.id === appId);
        if (fromPack) return fromPack as AppInfo;
        return apps.find((a) => a.id === appId);
      }).filter(Boolean) as AppInfo[];

      const totalCount = pack.totalCount || pack.apps.length;
      const installedCount = (typeof pack.installedCount === 'number' && hasLoadedPacks)
        ? pack.installedCount
        : packApps.filter((a) => a.installed || a.status === 'running' || (a as any).running).length;
      const runningCount = (typeof pack.runningCount === 'number' && hasLoadedPacks)
        ? pack.runningCount
        : packApps.filter((a) => a.status === 'running' || (a as any).running).length;

      const allInstalled = pack.allInstalled ?? (installedCount >= totalCount && totalCount > 0);
      const allRunning = pack.allRunning ?? (runningCount >= totalCount && totalCount > 0);

      return {
        ...pack,
        installedCount,
        runningCount,
        totalCount,
        allInstalled,
        allRunning,
        appsStatus: packApps,
      };
    });
  }, [packs, apps, hasLoadedPacks]);

  const handlePackAction = async (packId: string, action: 'install' | 'configure' | 'start' | 'stop') => {
    setActionError(null);
    setLoadingAction((prev) => ({ ...prev, [packId]: action }));
    try {
      let res: { ok: boolean; error?: string } = { ok: false };
      if (action === 'install') {
        setTimeout(() => {
          document.getElementById('store-terminal-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        res = await api.installPack(packId);
        if (res.ok) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#AA5CC3', '#3B82F6', '#10B981', '#F59E0B'],
          });
        }
      } else if (action === 'configure') {
        res = await api.configurePack(packId);
        if (res.ok) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#AA5CC3', '#00D26A', '#FF7F00', '#FFFFFF'],
          });
        }
      } else if (action === 'start') {
        res = await api.startPack(packId);
      } else if (action === 'stop') {
        res = await api.stopPack(packId);
      }

      if (!res.ok) {
        const packObj = packs.find((p) => p.id === packId);
        setActionError({
          id: packId,
          name: packObj ? packObj.name : packId,
          message: res.error || `Failed to ${action} pack ${packId}.`,
        });
      }
      await Promise.all([fetchApps(), fetchPacks()]);
    } catch (err: any) {
      setActionError({
        id: packId,
        message: err?.message || `Failed to ${action} pack ${packId}.`,
      });
    } finally {
      setLoadingAction((prev) => {
        const next = { ...prev };
        delete next[packId];
        return next;
      });
    }
  };

  const getAppUrl = (port: number) => {
    return getServiceUrl(port);
  };

  const handleAction = async (id: string, action: 'install' | 'uninstall' | 'start' | 'stop' | 'restart') => {
    setActionError(null);
    setLoadingAction((prev) => ({ ...prev, [id]: action }));
    try {
      let res: { ok: boolean; error?: string } = { ok: false };
      if (action === 'install') {
        res = await api.installApp(id);
        if (res.ok) {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: [getComputedStyle(document.documentElement).getPropertyValue('--tinapple-accent').trim(), getComputedStyle(document.documentElement).getPropertyValue('--tinapple-accent-secondary').trim(), '#ffffff'],
          });
        }
      } else if (action === 'uninstall') {
        res = await api.uninstallApp(id);
      } else if (action === 'start') {
        res = await api.startApp(id);
      } else if (action === 'stop') {
        res = await api.stopApp(id);
      } else if (action === 'restart') {
        res = await api.restartApp(id);
      }

      if (!res.ok) {
        const appObj = apps.find((a) => a.id === id);
        setActionError({
          id,
          name: appObj ? appObj.name : id,
          message: res.error || `Failed to ${action} ${id}.`,
        });
      }
      await fetchApps();
    } catch (err: any) {
      setActionError({
        id,
        message: err?.message || `Failed to ${action} ${id}.`,
      });
    } finally {
      setLoadingAction((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleOpenConfig = async (app: AppInfo) => {
    if (onOpenSettings) {
      onOpenSettings(app.id, app.name);
      return;
    }
    setConfigModalApp(app);
    setEditPort(app.port || 0);
    setRawConfigPreview('Loading current system configuration...');
    const data = await api.getAppConfig(app.id);
    if (data) {
      if (data.port) setEditPort(data.port);
      setRawConfigPreview(data.rawConfig || data.rawOverride || 'No custom config file found. Using system defaults.');
    } else {
      setRawConfigPreview('Configuration not yet initialized on filesystem.');
    }
  };

  const handleSaveConfig = async () => {
    if (!configModalApp) return;
    setSavingConfig(true);
    try {
      await api.updateAppConfig(configModalApp.id, {
        port: editPort > 0 ? editPort : undefined,
      });
      await fetchApps();
      setConfigModalApp(null);
    } finally {
      setSavingConfig(false);
    }
  };

  const visibleApps = useMemo(() => {
    return apps.filter((a) => isAdmin || (a.id !== 'suwayomi' && a.id !== 'suwayomi-server'));
  }, [apps, isAdmin]);

  const categories = useMemo(() => {
    const set = new Set<string>(['all']);
    visibleApps.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, [visibleApps]);

  const filteredApps = useMemo(() => {
    if (filterCategory === 'all') return visibleApps;
    return visibleApps.filter((a) => a.category === filterCategory);
  }, [visibleApps, filterCategory]);

  const selectedApp = filteredApps[selectedIndex] || filteredApps[0] || visibleApps[0] || apps[0];

  const carouselItems: CircularCarouselItem[] = useMemo(() => {
    return filteredApps.map((a) => {
      const ext = ['suwayomi', 'navidrome', 'filebrowser'].includes(a.id) ? 'png' : 'svg';
      return {
        src: a.icon ? `/icons/${a.icon}.${ext}` : '/icons/archlinux.svg',
        title: a.name,
        subtitle: a.tagline,
        alt: a.name,
      };
    });
  }, [filteredApps]);

  const renderStatusBadge = (app: AppInfo) => {
    if (app.status === 'running') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE • RUNNING
        </span>
      );
    }
    if (app.status === 'stopped') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          INSTALLED • STOPPED
        </span>
      );
    }
    if (app.status === 'failed') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          FAILED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        NOT INSTALLED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-tinapple-card/95 via-tinapple-surface/90 to-tinapple-card/95 border border-tinapple-border backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 text-xs mb-3 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tinapple Appliance & App Management</span>
          </div>

          <div className="mb-1">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight font-mono uppercase">
              APPLIANCE STORE & LIFECYCLE
            </h2>
          </div>

          <p className="text-xs md:text-sm text-tinapple-subtext leading-relaxed">
            Install, start, stop, configure, and monitor live systemd appliances with verified official packages and zero background telemetry.
          </p>
        </div>

        {/* Main Store Tab Switcher & View Mode */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border shadow-inner">
            <button
              onClick={() => setStoreTab('packs')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                storeTab === 'packs'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'text-tinapple-subtext hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Packs & Stacks ({computedPacks.length})</span>
            </button>
            <button
              onClick={() => setStoreTab('apps')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                storeTab === 'apps'
                  ? 'bg-tinapple-gold text-tinapple-dark shadow-md'
                  : 'text-tinapple-subtext hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Apps ({apps.length})</span>
            </button>
          </div>

          {storeTab === 'apps' && (
            <>
              <div className="flex items-center p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border overflow-x-auto">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setFilterCategory(c);
                      setSelectedIndex(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize font-mono transition-all ${
                      filterCategory === c
                        ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                        : 'text-tinapple-subtext hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex items-center p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                      : 'text-tinapple-subtext hover:text-white'
                  }`}
                  title="Bento Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('carousel')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'carousel'
                      ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                      : 'text-tinapple-subtext hover:text-white'
                  }`}
                  title="3D Radial View"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Error Alert Banner */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white font-mono">
                Operation Failed: {actionError.name || actionError.id}
              </div>
              <div className="text-xs text-rose-300 font-mono mt-0.5 whitespace-pre-wrap">
                {actionError.message}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-white transition-colors"
            title="Dismiss error notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: APPLIANCE PACKS & STACKS */}
      {storeTab === 'packs' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
          {computedPacks.map((pack) => {
            const isLoading = Boolean(loadingAction[pack.id]);
            return (
              <SpotlightCard
                key={pack.id}
                spotlightColor={`${pack.accentColor}25`}
                borderColor={`${pack.accentColor}45`}
                className="p-5 sm:p-7 flex flex-col justify-between border-white/[0.08] hover:border-white/20 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Soft ambient corner glow (no harsh lines) */}
                <div
                  className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
                  style={{ backgroundColor: pack.accentColor }}
                />

                <div>
                  {/* Card Header: Badge & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border shadow-sm backdrop-blur-md"
                      style={{
                        backgroundColor: `${pack.accentColor}18`,
                        borderColor: `${pack.accentColor}40`,
                      }}
                    >
                      <Zap className="w-3 h-3 fill-current" style={{ color: pack.accentColor }} />
                      <ShinyText text={pack.badge} shimmerColor="#ffffff" speed={3.5} className="text-[11px] font-mono font-bold" />
                    </div>

                    {/* Pack State Badge */}
                    {pack.allRunning ? (
                      <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        ACTIVE • ALL RUNNING
                      </span>
                    ) : pack.allInstalled ? (
                      <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        CONFIGURED • {pack.runningCount}/{pack.totalCount} RUNNING
                      </span>
                    ) : pack.installedCount > 0 ? (
                      <span className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        PARTIAL • {pack.installedCount}/{pack.totalCount} READY
                      </span>
                    ) : !hasLoadedPacks ? (
                      <span className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-tinapple-gold" />
                        CHECKING STATUS...
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        NOT INSTALLED ({pack.totalCount} APPS)
                      </span>
                    )}
                  </div>

                  {/* Pack Title & Tagline */}
                  <div className="flex items-start gap-3.5 mb-2">
                    <AppBrandIcon id={pack.icon} size={46} showBadge />
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                        {pack.name}
                      </h3>
                      <p className="text-xs font-semibold text-tinapple-gold font-mono mt-0.5">
                        {pack.tagline}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-tinapple-subtext leading-relaxed mt-2.5">
                    {pack.description}
                  </p>

                  {/* Included Appliances Container (Clean glass card without harsh separator lines) */}
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.05] backdrop-blur-sm">
                    <div className="text-[11px] font-mono font-bold text-slate-300 mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-tinapple-gold" />
                        Included Appliances ({pack.apps.length}):
                      </span>
                      <span className="text-xs font-normal text-tinapple-muted">
                        {pack.installedCount}/{pack.totalCount} Installed
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {pack.apps.map((appId) => {
                        const app = pack.appsStatus?.find((a) => a.id === appId) || apps.find((a) => a.id === appId);
                        const isAppRunning = app?.status === 'running' || (app as any)?.running;
                        const isAppInstalled = app?.installed || isAppRunning;
                        return (
                          <div
                            key={appId}
                            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                              isAppRunning
                                ? 'bg-slate-900/80 border-emerald-500/40 text-slate-200'
                                : isAppInstalled
                                ? 'bg-slate-900/60 border-amber-500/30 text-slate-300'
                                : 'bg-slate-900/40 border-slate-800 text-slate-500'
                            }`}
                          >
                            <AppBrandIcon id={appId} size={18} />
                            <span className="font-semibold">{app?.name.split(' ')[0] || appId}</span>
                            {app && app.port > 0 && (
                              <span className="text-[10px] text-tinapple-muted">:{app.port}</span>
                            )}
                            {isAppRunning ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Running" />
                            ) : isAppInstalled ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Stopped" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" title="Not Installed" />
                            )}
                            {isAppRunning && app && app.port > 0 && (
                              <a
                                href={getAppUrl(app.port)}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-emerald-300 transition-colors ml-0.5"
                                title={`Open ${app.name} WebUI`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pre-Configured Integration Highlights */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/30 border border-white/[0.04]">
                    <div className="text-[11px] font-mono font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Zero-Touch Automation Highlights:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {pack.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action Bar */}
                <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
                  {/* Left: Primary Deploy or Configure Button */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {!pack.allInstalled ? (
                      <button
                        onClick={() => handlePackAction(pack.id, 'install')}
                        disabled={Boolean(loadingAction[pack.id])}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-mono text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {loadingAction[pack.id] === 'install' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>Install Full Pack ({pack.totalCount - pack.installedCount} Remaining)</span>
                      </button>
                    ) : (
                      <StarBorder
                        as="button"
                        color={pack.accentColor || '#a855f7'}
                        speed="5s"
                        onClick={() => handlePackAction(pack.id, 'configure')}
                        disabled={Boolean(loadingAction[pack.id])}
                        className="flex-1 sm:flex-none"
                      >
                        <span className="flex items-center gap-2 font-mono text-xs font-bold text-white">
                          {loadingAction[pack.id] === 'configure' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-tinapple-gold" />
                          )}
                          <span>{pack.id === 'seerr-stack' ? 'Auto-Configure Stack' : 'Sync & Auto-Configure'}</span>
                        </span>
                      </StarBorder>
                    )}

                    {/* Start / Stop Stack Controls */}
                    {pack.installedCount > 0 && (
                      <>
                        {!pack.allRunning ? (
                          <button
                            onClick={() => handlePackAction(pack.id, 'start')}
                            disabled={Boolean(loadingAction[pack.id])}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold transition-all disabled:opacity-50"
                            title="Start all stopped services in this pack"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start All</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePackAction(pack.id, 'stop')}
                            disabled={Boolean(loadingAction[pack.id])}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold transition-all disabled:opacity-50"
                            title="Stop all services in this pack"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>Stop All</span>
                          </button>
                        )}
                      </>
                    )}

                    {onOpenGuide && (
                      <button
                        onClick={() => {
                          const packGuideMap: Record<string, string> = {
                            'seerr-stack': 'seerr',
                            'manga-suite': 'syncyomi',
                            'manga-syncyomi': 'syncyomi',
                            'privacy-shield': 'tailscale',
                            'audiophile-cloud': 'navidrome',
                            'cloud-vault': 'vaultwarden',
                            'second-brain': 'obsidian',
                            'gaming-anvil': 'tailscale',
                            'truenas-vault': 'syncthing',
                          };
                          onOpenGuide(packGuideMap[pack.id] || 'jellyfin');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-mono text-xs font-semibold transition-all active:scale-95"
                        title="View Stack & Client Setup Guide"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        <span>Stack Guide</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Quick Links to Key Stack Services */}
                  {pack.installedCount > 0 && (
                    <div className="flex items-center gap-2">
                      {pack.id === 'seerr-stack' && (
                        <>
                          <a
                            href={getAppUrl(5055)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Open Jellyseerr Requests WebUI"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Jellyseerr (:5055)
                          </a>
                          <a
                            href={getAppUrl(8096)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Open Jellyfin Streamer WebUI"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Jellyfin (:8096)
                          </a>
                        </>
                      )}
                      {pack.id === 'manga-suite' && (
                        <>
                          <a
                            href={getAppUrl(4567)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Suwayomi (:4567)
                          </a>
                          <a
                            href="/download/tsumiru"
                            download="tsumiru-client.apk"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Download Tsumiru Android APK for your phone (Connect via :4567)"
                          >
                            <Download className="w-3 h-3" />
                            Tsumiru APK
                          </a>
                        </>
                      )}
                      {pack.id === 'privacy-shield' && (
                        <a
                          href={getAppUrl(3000)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          AdGuard Home (:3000)
                        </a>
                      )}
                      {pack.id === 'audiophile-cloud' && (
                        <a
                          href={getAppUrl(4533)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Navidrome (:4533)
                        </a>
                      )}
                      {pack.id === 'cloud-vault' && (
                        <a
                          href={getAppUrl(8000)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Vaultwarden (:8000)
                        </a>
                      )}
                      {pack.id === 'second-brain' && (
                        <a
                          href={getAppUrl(8082)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          FileBrowser (:8082)
                        </a>
                      )}
                      {pack.id === 'manga-syncyomi' && (
                        <>
                          <a
                            href={getAppUrl(8282)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-200 border border-pink-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Open SyncYomi Sync Bridge WebUI"
                          >
                            <ExternalLink className="w-3 h-3" />
                            SyncYomi (:8282)
                          </a>
                          <a
                            href={getAppUrl(4567)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Open Suwayomi Manga Reader"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Suwayomi (:4567)
                          </a>
                          <a
                            href="/download/tsumiru"
                            download="tsumiru-client.apk"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Download Tsumiru Android APK"
                          >
                            <Download className="w-3 h-3" />
                            Tsumiru APK
                          </a>
                        </>
                      )}
                      {pack.id === 'truenas-vault' && (
                        <>
                          <a
                            href={getAppUrl(8082)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Open FileBrowser Quantum File Manager"
                          >
                            <ExternalLink className="w-3 h-3" />
                            FileBrowser (:8082)
                          </a>
                          <a
                            href={getAppUrl(8384)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                            title="Open Syncthing P2P Folder Sync"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Syncthing (:8384)
                          </a>
                        </>
                      )}
                      {pack.id === 'gaming-anvil' && (
                        <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 text-xs font-mono font-bold shadow-sm">
                          <span>PaperMC (:25565)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}

      {/* SECTION 2: INDIVIDUAL APPLIANCES */}
      {storeTab === 'apps' && (
        <>
          {/* VIEW 1: 3D RADIAL CAROUSEL VIEW */}
          {viewMode === 'carousel' && selectedApp && (
        <div className="space-y-6">
          <div className="relative rounded-2xl bg-tinapple-card/60 border border-tinapple-border/80 backdrop-blur-xl p-4 overflow-hidden h-[420px] w-full flex items-center justify-center">
            <CircularCarousel
              className="w-full h-full"
              items={carouselItems}
              cardWidth={180}
              aspectRatio={180 / 220}
              curve={200}
              preset="orbit"
              onChange={(idx) => setSelectedIndex(idx)}
              onItemClick={(_item, idx) => setSelectedIndex(idx)}
            />
          </div>

          {/* Selected App Inspector Card */}
          <SpotlightCard
            className="p-6 md:p-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-tinapple-border/70">
              <div className="flex items-center gap-4">
                <AppBrandIcon id={selectedApp.id} size={56} showBadge />
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white tracking-tight">{selectedApp.name}</h2>
                    {renderStatusBadge(selectedApp)}
                  </div>
                  <p className="text-sm font-semibold text-tinapple-gold font-mono mt-0.5">{selectedApp.tagline}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedApp.status === 'running' && selectedApp.port > 0 && (
                  <>
                    <a
                      href={getAppUrl(selectedApp.port)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {selectedApp.id === 'suwayomi' ? 'Suwayomi Web (:4567)' : `Open WebUI (:${selectedApp.port})`}
                    </a>
                    {selectedApp.id === 'suwayomi' && (
                      <a
                        href="/download/tsumiru"
                        download="tsumiru-client.apk"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                        title="Download Tsumiru Native Android APK (Connects via :4567)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tsumiru Phone APK
                      </a>
                    )}
                  </>
                )}

                {selectedApp.status === 'running' && (
                  <>
                    <button
                      onClick={() => handleAction(selectedApp.id, 'restart')}
                      disabled={Boolean(loadingAction[selectedApp.id])}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition-all"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${loadingAction[selectedApp.id] === 'restart' ? 'animate-spin' : ''}`} />
                      Restart
                    </button>
                    <button
                      onClick={() => handleAction(selectedApp.id, 'stop')}
                      disabled={Boolean(loadingAction[selectedApp.id])}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium transition-all"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  </>
                )}

                {selectedApp.status === 'stopped' && (
                  <button
                    onClick={() => handleAction(selectedApp.id, 'start')}
                    disabled={Boolean(loadingAction[selectedApp.id])}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition-all hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Service
                  </button>
                )}

                {selectedApp.status === 'not_installed' && (
                  <button
                    onClick={() => handleAction(selectedApp.id, 'install')}
                    disabled={Boolean(loadingAction[selectedApp.id])}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono transition-all shadow-lg shadow-emerald-950/40"
                  >
                    {loadingAction[selectedApp.id] === 'install' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Install Appliance Package
                  </button>
                )}

                {onOpenGuide && (
                  <button
                    onClick={() => {
                      const guideMap: Record<string, string> = {
                        jellyfin: 'jellyfin',
                        suwayomi: 'syncyomi',
                        'suwayomi-server': 'syncyomi',
                        beeper: 'beeper',
                        vaultwarden: 'vaultwarden',
                        syncthing: 'syncthing',
                        couchdb: 'obsidian',
                        radarr: 'servarr',
                        sonarr: 'servarr',
                        prowlarr: 'servarr',
                        qbittorrent: 'servarr',
                        playit: 'tailscale',
                        protonvpn: 'tailscale',
                        homarr: 'homarr',
                      };
                      onOpenGuide(guideMap[selectedApp.id] || 'jellyfin');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-mono transition-all"
                    title="View Client App & Setup Guide"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    Guide
                  </button>
                )}

                {selectedApp.installed && (
                  <>
                    <button
                      onClick={() => handleOpenConfig(selectedApp)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-all"
                      title="Configure Service"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configure
                    </button>
                    <button
                      onClick={() => handleAction(selectedApp.id, 'uninstall')}
                      disabled={Boolean(loadingAction[selectedApp.id])}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-mono transition-all"
                      title="Uninstall Package"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Uninstall
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-tinapple-subtext leading-relaxed mt-5">{selectedApp.description}</p>
          </SpotlightCard>
        </div>
      )}

      {/* VIEW 2: BENTO GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => {
            const isLoading = Boolean(loadingAction[app.id]);
            return (
              <SpotlightCard
                key={app.id}
                className="p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <AppBrandIcon id={app.id} size={44} showBadge />
                    {renderStatusBadge(app)}
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{app.name}</h3>
                  <p className="text-xs font-semibold text-tinapple-gold mt-0.5 font-mono">{app.tagline}</p>
                  <p className="text-xs text-tinapple-subtext mt-2.5 leading-relaxed line-clamp-3">
                    {app.description}
                  </p>

                  {/* Port & Unit Metadata */}
                  <div className="mt-4 pt-3 border-t border-tinapple-border/70 flex items-center justify-between text-[11px] font-mono text-tinapple-muted">
                    <span>Unit: <code className="text-slate-300">{app.unit}</code></span>
                    {app.port > 0 && (
                      <span className="text-emerald-400 font-bold">Port :{app.port}</span>
                    )}
                  </div>
                </div>

                {/* Card Action Bar */}
                <div className="mt-5 pt-3 border-t border-tinapple-border/50 flex flex-wrap items-center justify-between gap-2">
                  {/* Left Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {app.status === 'running' && (
                      <>
                        {app.port > 0 && (
                          <a
                            href={getAppUrl(app.port)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1"
                            title={app.id === 'suwayomi' ? 'Open Suwayomi WebUI' : 'Open Web Dashboard'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {app.id === 'suwayomi' ? 'WebUI' : 'Open'}
                          </a>
                        )}
                        {app.id === 'suwayomi' && (
                          <a
                            href="/download/tsumiru"
                            download="tsumiru-client.apk"
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-mono font-bold flex items-center gap-1"
                            title="Download Tsumiru Android APK"
                          >
                            <Download className="w-3.5 h-3.5" />
                            APK
                          </a>
                        )}
                        <button
                          onClick={() => handleAction(app.id, 'restart')}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
                          title="Restart Daemon"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${loadingAction[app.id] === 'restart' ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'stop')}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs"
                          title="Stop Daemon"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {app.status === 'stopped' && (
                      <button
                        onClick={() => handleAction(app.id, 'start')}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start
                      </button>
                    )}

                    {app.status === 'not_installed' && (
                      <button
                        onClick={() => handleAction(app.id, 'install')}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs font-mono flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        {loadingAction[app.id] === 'install' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Install
                      </button>
                    )}
                  </div>

                  {/* Right Tools (Configure & Uninstall) */}
                  <div className="flex items-center gap-1.5">
                    {onOpenGuide && (
                      <button
                        onClick={() => {
                          const guideMap: Record<string, string> = {
                            jellyfin: 'jellyfin',
                            suwayomi: 'syncyomi',
                            'suwayomi-server': 'syncyomi',
                            beeper: 'beeper',
                            vaultwarden: 'vaultwarden',
                            syncthing: 'syncthing',
                            couchdb: 'obsidian',
                            radarr: 'servarr',
                            sonarr: 'servarr',
                            prowlarr: 'servarr',
                            qbittorrent: 'servarr',
                            playit: 'tailscale',
                            protonvpn: 'tailscale',
                            homarr: 'homarr',
                          };
                          onOpenGuide(guideMap[app.id] || 'jellyfin');
                        }}
                        className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs transition-colors flex items-center gap-1"
                        title={`View ${app.name} Client & Setup Guide`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline">Guide</span>
                      </button>
                    )}
                    {app.installed && (
                      <>
                        <button
                          onClick={() => handleOpenConfig(app)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs transition-colors"
                          title="Configure settings & port"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'uninstall')}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors"
                          title="Uninstall package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
      </>
    )}

      {/* CONFIG MANAGEMENT MODAL */}
      {configModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <AppBrandIcon id={configModalApp.id} size={36} showBadge />
                <div>
                  <h3 className="text-base font-bold text-white">{configModalApp.name} Configuration</h3>
                  <span className="text-xs font-mono text-tinapple-gold">{configModalApp.unit}</span>
                </div>
              </div>
              <button
                onClick={() => setConfigModalApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Port configuration */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Service Listen Port
                </label>
                <input
                  type="number"
                  value={editPort || ''}
                  onChange={(e) => setEditPort(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 8096"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-tinapple-gold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Updates systemd service drop-in environment <code>PORT={editPort}</code>.
                </span>
              </div>

              {/* System Config File Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Configuration File Preview
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {configModalApp.configPath || 'systemd drop-in'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
                  {rawConfigPreview}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfigModalApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-tinapple-gold hover:brightness-110 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-tinapple-gold/20"
              >
                {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save & Restart Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Download Progress & Provisioning Terminal */}
      <StoreTerminal />
    </div>
  );
};

export default ChaddyStore;
