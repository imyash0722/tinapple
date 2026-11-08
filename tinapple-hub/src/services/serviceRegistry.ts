/**
 * Object-Oriented Appliance Service Architecture
 * Encapsulates service configuration, ports, reverse proxy routing, and direct endpoints.
 */

export type ServiceCategory = 'media' | 'downloads' | 'storage' | 'network' | 'system' | 'custom';

export const DEFAULT_TAILSCALE_IP = '100.67.207.60';

export function getTailscaleIp(): string {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('tinapple_tailscale_ip');
    if (cached && cached !== '100.108.215.120') {
      return cached;
    }
    return DEFAULT_TAILSCALE_IP;
  }
  return DEFAULT_TAILSCALE_IP;
}

export interface ApplianceServiceOptions {
  id: string;
  name: string;
  displayName?: string;
  tagline: string;
  category: ServiceCategory;
  icon: string;
  port: number;
  subpath: string;
  guideId?: string;
  directPortPreferred?: boolean;
  defaultColSpan?: 3 | 4 | 6 | 12;
  unit?: string;
}

export class ApplianceService {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly tagline: string;
  readonly category: ServiceCategory;
  readonly icon: string;
  readonly port: number;
  readonly subpath: string;
  readonly guideId?: string;
  readonly directPortPreferred: boolean;
  readonly defaultColSpan: 3 | 4 | 6 | 12;
  readonly unit?: string;

  constructor(opts: ApplianceServiceOptions) {
    this.id = opts.id;
    this.name = opts.name;
    this.displayName = opts.displayName || opts.name;
    this.tagline = opts.tagline;
    this.category = opts.category;
    this.icon = opts.icon;
    this.port = opts.port;
    this.subpath = opts.subpath;
    this.guideId = opts.guideId;
    this.directPortPreferred = opts.directPortPreferred ?? (opts.port > 0);
    this.defaultColSpan = opts.defaultColSpan || 3;
    this.unit = opts.unit;
  }

  /**
   * Resolves the canonical destination URL for opening this service.
   * If running directly on port 8088 or if directPortPreferred is enabled,
   * returns the direct HTTP port link (e.g., http://<host>:5055/ for Seerr).
   * Otherwise resolves clean subpath for reverse proxies without double slashes.
   */
  getOpenUrl(currentOrigin?: string): string {
    let hostname = getTailscaleIp();
    let isDirectPortAccess = true;

    if (typeof window !== 'undefined' && window.location) {
      const customUrl = localStorage.getItem('tinapple_server_url');
      if (customUrl) {
        try {
          const parsed = new URL(customUrl);
          hostname = parsed.hostname;
        } catch {
          hostname = getTailscaleIp();
        }
      } else {
        const h = window.location.hostname;
        if (!h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.ts.net') || h === 'tauri.localhost') {
          hostname = getTailscaleIp();
        } else {
          hostname = h;
        }
      }
      const port = window.location.port;
      // If accessed via port 8088 (tinapple-dash Go port), direct port is mandatory
      // because 8088 does not have reverse proxy path handlers for non-API routes.
      isDirectPortAccess = port === '8088' || port === '5173' || port === '3000' || this.directPortPreferred;
    } else if (currentOrigin) {
      try {
        const u = new URL(currentOrigin);
        hostname = u.hostname;
        if (hostname.endsWith('.ts.net')) {
          hostname = getTailscaleIp();
        }
        isDirectPortAccess = u.port === '8088' || this.directPortPreferred;
      } catch {
        // ignore
      }
    }

    if (this.port > 0 && isDirectPortAccess) {
      return `http://${hostname}:${this.port}/`;
    }

    if (this.subpath) {
      const cleanSub = this.subpath.startsWith('/') ? this.subpath : `/${this.subpath}`;
      return cleanSub;
    }

    if (this.port > 0) {
      return `http://${hostname}:${this.port}/`;
    }

    return `/${this.id}`;
  }

  /**
   * Formatted display badge for port or path (e.g. ":5055")
   */
  getDisplayPort(): string {
    if (this.port > 0) {
      return `:${this.port}`;
    }
    return '';
  }

  /**
   * Clean subpath display string (e.g. "/seerr" instead of "/seerr/seerr/")
   */
  getDisplayPath(): string {
    if (this.subpath) {
      // Ensure single leading slash, no duplicate trailing slashes
      const cleaned = this.subpath.replace(/\/+/g, '/').replace(/\/$/, '');
      return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    }
    return `/${this.id}`;
  }

  getGuideId(): string {
    return this.guideId || this.id;
  }
}

export class ApplianceServiceRegistry {
  private static instance: ApplianceServiceRegistry;
  private services: Map<string, ApplianceService> = new Map();
  private portIndex: Map<number, ApplianceService> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ApplianceServiceRegistry {
    if (!ApplianceServiceRegistry.instance) {
      ApplianceServiceRegistry.instance = new ApplianceServiceRegistry();
    }
    return ApplianceServiceRegistry.instance;
  }

  public register(service: ApplianceService): void {
    this.services.set(service.id, service);
    this.services.set(service.name.toLowerCase(), service);
    if (service.port > 0) {
      this.portIndex.set(service.port, service);
    }
  }

  public get(idOrName: string): ApplianceService | undefined {
    const clean = idOrName.toLowerCase().replace(/\.service$/, '').replace(/@.*$/, '');
    return this.services.get(clean) || this.services.get(idOrName);
  }

  public getByPort(port: number): ApplianceService | undefined {
    return this.portIndex.get(port);
  }

  public getAll(): ApplianceService[] {
    const seen = new Set<string>();
    const result: ApplianceService[] = [];
    for (const s of this.services.values()) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        result.push(s);
      }
    }
    return result;
  }

  public getByCategory(category: ServiceCategory): ApplianceService[] {
    return this.getAll().filter((s) => s.category === category);
  }

  /**
   * Helper to resolve open URL by ID or port
   */
  public resolveUrl(idOrPort: string | number): string {
    if (typeof idOrPort === 'number') {
      const match = this.getByPort(idOrPort);
      if (match) return match.getOpenUrl();
      const host = typeof window !== 'undefined' ? window.location.hostname : getTailscaleIp();
      return `http://${host}:${idOrPort}/`;
    }
    const match = this.get(idOrPort);
    if (match) return match.getOpenUrl();
    return `/${idOrPort}`;
  }

  private registerDefaults(): void {
    const defaults: ApplianceServiceOptions[] = [
      // Media & Streaming
      {
        id: 'jellyfin',
        name: 'Jellyfin Media Server',
        displayName: 'Jellyfin Media Server',
        tagline: 'Hardware Transcoding & 4K DirectPlay',
        category: 'media',
        icon: '🎬',
        port: 8096,
        subpath: '/jellyfin',
        guideId: 'jellyfin',
        unit: 'jellyfin.service',
      },
      {
        id: 'ombi',
        name: 'Ombi Media Requests',
        displayName: 'Ombi Media Requests',
        tagline: 'Leading Requests & User Management Portal',
        category: 'media',
        icon: '🍿',
        port: 5000,
        subpath: '/ombi',
        guideId: 'ombi',
        directPortPreferred: true,
        unit: 'ombi.service',
      },
      {
        id: 'navidrome',
        name: 'Navidrome Music Server',
        displayName: 'Navidrome Music Server',
        tagline: 'Lossless Audio & Subsonic API Streaming',
        category: 'media',
        icon: '🎵',
        port: 4533,
        subpath: '/navidrome',
        guideId: 'navidrome',
        directPortPreferred: true,
        unit: 'navidrome.service',
      },
      {
        id: 'tinapple-music-queuer',
        name: 'Tinapple Music Queuer',
        displayName: 'Tinapple Music Queuer',
        tagline: 'Lossless FLAC Queue Manager for Navidrome',
        category: 'media',
        icon: '🎧',
        port: 0,
        subpath: '/music-queuer',
        guideId: 'tinapple-music-queuer',
        directPortPreferred: false,
        unit: 'tinapple-music-queuer.service',
      },
      {
        id: 'pinchflat',
        name: 'Pinchflat YouTube Stack',
        displayName: 'Pinchflat YouTube Stack',
        tagline: 'Automated YouTube Channel Archiver',
        category: 'media',
        icon: '📺',
        port: 8945,
        subpath: '/pinchflat',
        guideId: 'pinchflat',
        directPortPreferred: true,
        unit: 'pinchflat.service',
      },
      {
        id: 'suwayomi',
        name: 'Suwayomi Manga Server',
        displayName: 'Suwayomi Manga Server',
        tagline: 'Keiyoushi Extensions & Tachiyomi Sync',
        category: 'media',
        icon: '📖',
        port: 4567,
        subpath: '/suwayomi',
        guideId: 'suwayomi',
        directPortPreferred: true,
        unit: 'suwayomi-server.service',
      },
      {
        id: 'tsumiru',
        name: 'Tsumiru Reader',
        displayName: 'Tsumiru Reader',
        tagline: 'Offline Manga Reader & Desktop CanvasKit',
        category: 'media',
        icon: '📚',
        port: 4567,
        subpath: '/tsumiru',
        guideId: 'suwayomi',
        directPortPreferred: true,
      },

      // Downloads & Servarr Automation
      {
        id: 'qbittorrent',
        name: 'qBittorrent Headless',
        displayName: 'qBittorrent Headless',
        tagline: 'P2P BitTorrent Client & WebUI',
        category: 'downloads',
        icon: '📥',
        port: 8080,
        subpath: '/qbittorrent',
        guideId: 'qbittorrent',
        directPortPreferred: true,
        unit: 'qbittorrent-nox.service',
      },
      {
        id: 'radarr',
        name: 'Radarr Movie Automator',
        displayName: 'Radarr Movie Automator',
        tagline: 'Automated 4K/1080p Movie Indexer & Grabber',
        category: 'downloads',
        icon: '🍿',
        port: 7878,
        subpath: '/radarr',
        guideId: 'radarr',
        directPortPreferred: true,
        unit: 'radarr.service',
      },
      {
        id: 'sonarr',
        name: 'Sonarr TV Series Automator',
        displayName: 'Sonarr TV Series Automator',
        tagline: 'Automated Anime & TV Episode PVR',
        category: 'downloads',
        icon: '📺',
        port: 8989,
        subpath: '/sonarr',
        guideId: 'sonarr',
        directPortPreferred: true,
        unit: 'sonarr.service',
      },
      {
        id: 'prowlarr',
        name: 'Prowlarr Tracker Proxy',
        displayName: 'Prowlarr Tracker Proxy',
        tagline: 'Unified Torrent & Usenet Indexer Proxy',
        category: 'downloads',
        icon: '🔍',
        port: 9696,
        subpath: '/prowlarr',
        guideId: 'prowlarr',
        directPortPreferred: true,
        unit: 'prowlarr.service',
      },
      {
        id: 'bazarr',
        name: 'Bazarr Subtitles',
        displayName: 'Bazarr Subtitles',
        tagline: 'Multilingual Automated Subtitle Matcher',
        category: 'downloads',
        icon: '💬',
        port: 6767,
        subpath: '/bazarr',
        guideId: 'bazarr',
        directPortPreferred: true,
        unit: 'bazarr.service',
      },

      // Storage & Cloud
      {
        id: 'syncthing',
        name: 'Syncthing Decentralized Sync',
        displayName: 'Syncthing Decentralized Sync',
        tagline: 'Continuous Bidirectional P2P Replication',
        category: 'storage',
        icon: '🔄',
        port: 8384,
        subpath: '/syncthing',
        guideId: 'syncthing',
        directPortPreferred: true,
        unit: 'syncthing@pineapple.service',
      },
      {
        id: 'vaultwarden',
        name: 'Vaultwarden Password Vault',
        displayName: 'Vaultwarden Password Vault',
        tagline: 'Encrypted Bitwarden Zero-Knowledge Cloud',
        category: 'storage',
        icon: '🔐',
        port: 8000,
        subpath: '/vault',
        guideId: 'vaultwarden',
        unit: 'vaultwarden.service',
      },

      // Network & Privacy
      {
        id: 'adguard',
        name: 'AdGuard Home DNS',
        displayName: 'AdGuard Home DNS',
        tagline: 'Network-wide DNS Tracker & Malware Blocker',
        category: 'network',
        icon: '🛡️',
        port: 3000,
        subpath: '/adguard',
        guideId: 'adguard',
        directPortPreferred: true,
        unit: 'adguardhome.service',
      },
      {
        id: 'tor',
        name: 'Tor Privacy Onion Proxy',
        displayName: 'Tor Privacy Onion Proxy',
        tagline: 'Onion Routing & SOCKS5 Privacy Daemon',
        category: 'network',
        icon: '🧅',
        port: 9050,
        subpath: '/guides/tor.html',
        guideId: 'tor',
        unit: 'tor.service',
      },

      // System & Dashboard
      {
        id: 'homarr',
        name: 'Homarr Dashboard Engine',
        displayName: 'Homarr Dashboard Engine',
        tagline: 'Customizable homelab dashboard engine with real-time integration widgets',
        category: 'system',
        icon: '🟧',
        port: 7575,
        subpath: '/',
        guideId: 'homarr',
        directPortPreferred: true,
        unit: 'homarr.service',
      },
    ];

    for (const def of defaults) {
      this.register(new ApplianceService(def));
    }
  }
}

export const serviceRegistry = ApplianceServiceRegistry.getInstance();
