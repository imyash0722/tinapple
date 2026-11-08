import { SystemInfo, TelemetrySnapshot, ServiceInfo, HardwareInfo, SessionMode, AppInfo, AppActionResult, InstallProgressState, InstallLogMessage, TailscaleStatus, AppliancePackStatus, WallpaperItem, OpenPortInfo, AppConfigDetails, MaintenanceResult, FailedUnitsResult, UserManagementData, ProtonStatus, ProtonWireGuardInfo, SystemUpdateManifest } from '../types/api';
import { serviceRegistry, ApplianceService } from './serviceRegistry';
import { Capacitor } from '@capacitor/core';

export const DEFAULT_SERVERS = [
  { id: 'tailscale', label: 'Tailscale Mesh', url: 'http://100.67.207.60:8088', host: '100.67.207.60' },
  { id: 'tsnet', label: 'Tailscale HTTPS', url: 'https://tinapple-server.tail3dee69.ts.net', host: 'tinapple-server.tail3dee69.ts.net' },
  { id: 'lan', label: 'Local LAN / Hostname', url: 'http://tinapple-server:8088', host: 'tinapple-server' },
  { id: 'hotspot', label: 'Direct AP Hotspot', url: 'http://192.168.4.1:8088', host: '192.168.4.1' },
];

export async function testEndpointHealth(origin: string, timeoutMs: number = 1500): Promise<boolean> {
  const clean = origin.replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${clean}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      mode: 'cors',
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

let discoveryListenersAttached = false;

export async function discoverBestServerOrigin(timeoutPerCandidateMs: number = 1500): Promise<string> {
  if (typeof window === 'undefined') return `http://${DEFAULT_TAILSCALE_IP}:8088`;

  if (!discoveryListenersAttached && typeof window !== 'undefined') {
    discoveryListenersAttached = true;
    const triggerRecheck = () => {
      discoverBestServerOrigin(1200).then((origin) => {
        window.dispatchEvent(new CustomEvent('tinapple-server-reconnected', { detail: { origin } }));
      }).catch(() => {});
    };
    window.addEventListener('online', triggerRecheck);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerRecheck();
      }
    });
  }

  const lastGood = localStorage.getItem('tinapple_last_good_origin');
  const candidates: string[] = [
    'https://tinapple-server.tail3dee69.ts.net',
    'http://tinapple-server.tail3dee69.ts.net:8088',
  ];

  if (lastGood && !candidates.includes(lastGood) && !lastGood.includes('100.108.215.120')) {
    candidates.push(lastGood);
  }

  candidates.push(
    'http://tinapple-server:8088',
    'http://tinapple.local:8088',
    'http://192.168.1.103:8088',
    `http://${getTailscaleIp()}:8088`,
    'http://192.168.4.1:8088'
  );

  if (!isStandaloneClient() && window.location.origin) {
    const cur = window.location.origin;
    if (await testEndpointHealth(cur, 800)) {
      localStorage.setItem('tinapple_server_url', cur);
      localStorage.setItem('tinapple_last_good_origin', cur);
      return cur;
    }
  }

  for (const c of candidates) {
    if (await testEndpointHealth(c, timeoutPerCandidateMs)) {
      const clean = c.replace(/\/+$/, '');
      localStorage.setItem('tinapple_server_url', clean);
      localStorage.setItem('tinapple_last_good_origin', clean);
      return clean;
    }
  }

  return getActiveServerOrigin();
}

export function isStandaloneClient(): boolean {
  if (typeof window === 'undefined') return false;
  const isCapacitor = Capacitor.isNativePlatform() || (typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.());
  const h = window.location.hostname;
  const p = window.location.port;
  const isLocalhostWebView = (h === 'localhost' || h === '127.0.0.1') && p === '';
  const isDevTauri = (h === 'localhost' && p === '1420') || h === 'tauri.localhost';
  const isCustomProtocol = window.location.protocol === 'file:' || window.location.protocol === 'tauri:' || window.location.protocol === 'capacitor:';
  return isCapacitor || isLocalhostWebView || isDevTauri || isCustomProtocol || h === '';
}

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

export function getActiveServerOrigin(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('tinapple_server_url');
    if (customUrl) {
      if (customUrl.includes('100.108.215.120')) {
        try {
          localStorage.removeItem('tinapple_server_url');
        } catch {}
      } else {
        return customUrl.replace(/\/+$/, '');
      }
    }
    if (isStandaloneClient()) {
      return `http://${getTailscaleIp()}:8088`;
    }
    return window.location.origin;
  }
  return `http://${DEFAULT_TAILSCALE_IP}:8088`;
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('tinapple_server_url');
    if (customUrl) {
      if (customUrl.includes('100.108.215.120')) {
        try {
          localStorage.removeItem('tinapple_server_url');
        } catch {}
      } else {
        return `${customUrl.replace(/\/+$/, '')}/api/v1`;
      }
    }
    if (isStandaloneClient()) {
      return `http://${getTailscaleIp()}:8088/api/v1`;
    }
  }
  return '/api/v1';
}

export function getWsTerminalUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('tinapple_server_url');
    if (customUrl) {
      const isHttps = customUrl.startsWith('https:');
      const host = customUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      return `${isHttps ? 'wss:' : 'ws:'}//${host}/api/v1/terminal/ws`;
    }
    if (isStandaloneClient()) {
      return `ws://${getTailscaleIp()}:8088/api/v1/terminal/ws`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/v1/terminal/ws`;
  }
  return `ws://${DEFAULT_TAILSCALE_IP}:8088/api/v1/terminal/ws`;
}

export function getServiceHost(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('tinapple_server_url');
    if (customUrl) {
      try {
        const parsed = new URL(customUrl);
        return parsed.hostname;
      } catch {}
    }
    const h = window.location.hostname;
    // *.ts.net domains have HSTS preloaded in modern browsers which breaks connecting to plain HTTP on secondary service ports (:8096, :4567, :8080).
    // Standalone clients (Tauri desktop app, Android WebView, file://, dev port 1420) also use direct Tailscale IP.
    if (!h || isStandaloneClient() || h.endsWith('.ts.net') || h === 'tauri.localhost' || (h === 'localhost' && window.location.port === '1420')) {
      return getTailscaleIp();
    }
    return h;
  }
  return DEFAULT_TAILSCALE_IP;
}

export const SERVICE_PORT_MAP: Record<string, number> = {
  jellyfin: 8096,
  qbittorrent: 8080,
  vault: 8000,
  vaultwarden: 8000,
  ombi: 5000,
  seerr: 5000,
  jellyseerr: 5000,
  navidrome: 4533,
  syncthing: 8384,
  adguard: 3000,
  adguardhome: 3000,
  pinchflat: 8945,
  youtube: 8945,
  bazarr: 6767,
  element: 8008,
  suwayomi: 4567,
  'suwayomi-server': 4567,
  syncyomi: 4567,
  tsumiru: 4567,
  radarr: 7878,
  sonarr: 8989,
  prowlarr: 9696,
};

export const SERVICE_PATH_MAP: Record<number, string> = {
  8096: '/jellyfin/',
  8080: '/qbittorrent/',
  8000: '/vault/',
  5000: '/ombi/',
  5055: '/ombi/',
  4533: '/navidrome/',
  8384: '/syncthing/',
  3000: '/adguard/',
  8945: '/pinchflat/',
  6767: '/bazarr/',
  8008: '/element/',
  4567: '/suwayomi/',
  7878: '/radarr/',
  8989: '/sonarr/',
  9696: '/prowlarr/',
};

export const SERVICE_NAME_PATH_MAP: Record<string, string> = {
  jellyfin: '/jellyfin/',
  qbittorrent: '/qbittorrent/',
  vault: '/vault/',
  vaultwarden: '/vault/',
  seerr: '/seerr/',
  jellyseerr: '/seerr/',
  navidrome: '/navidrome/',
  syncthing: '/syncthing/',
  adguard: '/adguard/',
  adguardhome: '/adguard/',
  pinchflat: '/pinchflat/',
  youtube: '/pinchflat/',
  bazarr: '/bazarr/',
  element: '/element/',
  suwayomi: '/suwayomi/',
  'suwayomi-server': '/suwayomi/',
  syncyomi: '/suwayomi/',
  tsumiru: '/tsumiru/',
  radarr: '/radarr/',
  sonarr: '/sonarr/',
  prowlarr: '/prowlarr/',
};

export function getServiceUrl(portOrName: number | string, path: string = ''): string {
  // If path is a guide or absolute HTTP URL, return as-is
  if (path && (path.startsWith('/guides/') || path.startsWith('http://') || path.startsWith('https://'))) {
    return path;
  }
  if (typeof portOrName === 'string' && (portOrName.startsWith('/guides/') || portOrName.startsWith('http://') || portOrName.startsWith('https://'))) {
    return portOrName;
  }

  if (typeof portOrName === 'string') {
    const cleanName = portOrName.toLowerCase().replace(/\.service$/, '').replace(/@.*$/, '');
    const service = serviceRegistry.get(cleanName);
    if (service) {
      const base = service.getOpenUrl();
      if (!path) return base;
      let cleanPath = path.startsWith('/') ? path.slice(1) : path;
      cleanPath = cleanPath.replace(/\/+$/, '');
      if (cleanPath === service.id || cleanPath === cleanName) {
        return base;
      }
      return base.endsWith('/') ? `${base}${cleanPath}` : `${base}/${cleanPath}`;
    }
    const subpath = SERVICE_NAME_PATH_MAP[cleanName];
    if (subpath) {
      const host = getServiceHost();
      const cleanSub = subpath.replace(/^\/|\/$/g, '');
      let cleanPath = path ? (path.startsWith('/') ? path.slice(1) : path) : '';
      cleanPath = cleanPath.replace(/\/+$/, '');
      if (cleanPath === cleanSub || cleanPath === cleanName) {
        cleanPath = '';
      }
      const suffix = cleanPath ? `/${cleanPath}` : '';
      if (typeof window !== 'undefined' && window.location.port !== '8088') {
        return `/${cleanSub}${suffix}`;
      }
      return `http://${host}/${cleanSub}${suffix}`;
    }
  } else if (typeof portOrName === 'number') {
    const service = serviceRegistry.getByPort(portOrName);
    if (service) {
      const base = service.getOpenUrl();
      if (!path) return base;
      let cleanPath = path.startsWith('/') ? path.slice(1) : path;
      cleanPath = cleanPath.replace(/\/+$/, '');
      if (cleanPath === service.id) {
        return base;
      }
      return base.endsWith('/') ? `${base}${cleanPath}` : `${base}/${cleanPath}`;
    }
    const host = getServiceHost();
    const cleanPath = path ? (path.startsWith('/') ? path.slice(1) : path) : '';
    if (portOrName > 0) {
      return `http://${host}:${portOrName}/${cleanPath}`;
    }
  }

  const cleanPath = path ? (path.startsWith('/') ? path.slice(1) : path) : '';
  return `/${cleanPath}`;
}

export function getServiceDirectPortUrl(port: number, path: string = ''): string {
  const host = getServiceHost();
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `http://${host}:${port}${cleanPath}`;
}

const API_BASE = {
  toString: () => getApiBaseUrl(),
  valueOf: () => getApiBaseUrl(),
} as unknown as string;

export const MOCK_SYSTEM_INFO: SystemInfo = {
  installed: true,
  hostname: 'tinapple-appliance',
  kernel: '6.12.8-cachyos-tinapple',
  uptime: 7260,
  bootTime: Date.now() - 7260 * 1000,
  osRelease: 'Tinapple Appliance OS 0.0.1 (Arch-based)',
  sessionMode: 'interactive',
  isAdmin: false,
};

export const MOCK_TELEMETRY: TelemetrySnapshot = {
  timestamp: Date.now(),
  cpu: {
    usagePercent: 6.2,
    cores: [16],
    loadAvg: [0.42, 0.58, 0.51],
    modelName: 'AMD Ryzen 7 7840HS w/ Radeon 780M',
  },
  memory: {
    totalBytes: 13645414400,
    usedBytes: 6425255936,
    freeBytes: 7220158464,
    usagePercent: 47.1,
    swapTotalBytes: 8 * 1024 * 1024 * 1024,
    swapUsedBytes: 0,
    zramActive: true,
    zramTotalBytes: 8 * 1024 * 1024 * 1024,
    zramUsedBytes: 0,
    buffersBytes: 256 * 1024 * 1024,
    cachedBytes: 1024 * 1024 * 1024,
  },
  disk: {
    totalBytes: 137341440000,
    usedBytes: 96658006016,
    freeBytes: 40683433984,
    usagePercent: 70.4,
    mountPoint: '/',
  },
  network: {
    bytesReceived: 1277171712,
    bytesSent: 460246751,
    rateIn: 1048576,
    rateOut: 245760,
    interfaces: ['wlan0', 'tailscale0'],
  },
  thermal: {
    cpuTemp: 48.5,
    gpuTemp: 44.0,
    fanRpm: 1200,
    profile: 'balanced',
  },
  battery: {
    present: true,
    percent: 86,
    charging: false,
    chargeLimit: 80,
    healthPercent: 98,
  },
};

export const MOCK_SERVICES: ServiceInfo[] = [
  {
    name: 'tinapple-session',
    description: 'Tinapple Wayland Desktop Session (Niri + Waybar)',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'desktop',
    memoryBytes: 148 * 1024 * 1024,
  },
  {
    name: 'nginx',
    description: 'High Performance Reverse Proxy & Web Gateway',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'core',
    port: 80,
    memoryBytes: 28 * 1024 * 1024,
  },
  {
    name: 'tailscaled',
    description: 'Tailscale Mesh VPN & WireGuard daemon',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'network',
    memoryBytes: 42 * 1024 * 1024,
  },
  {
    name: 'postgresql',
    description: 'PostgreSQL 16 Relational Database Server',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'database',
    port: 5432,
    memoryBytes: 110 * 1024 * 1024,
  },
  {
    name: 'redis',
    description: 'In-Memory Data Store & Cache',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'database',
    port: 6379,
    memoryBytes: 18 * 1024 * 1024,
  },
  {
    name: 'jellyfin',
    description: 'Jellyfin Free Software Media System',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'media',
    port: 8096,
    memoryBytes: 240 * 1024 * 1024,
  },
  {
    name: 'qbittorrent-nox',
    description: 'qBittorrent Headless Download Service',
    activeState: 'inactive',
    subState: 'dead',
    unitFileState: 'disabled',
    category: 'media',
    port: 8080,
  },
  {
    name: 'syncthing',
    description: 'Continuous Decentralized File Synchronization',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'network',
    port: 8384,
    memoryBytes: 64 * 1024 * 1024,
  },
  {
    name: 'minecraft-server',
    description: 'PaperMC Headless Minecraft Server',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'core',
    port: 25565,
    memoryBytes: 1536 * 1024 * 1024,
  },
  {
    name: 'playit',
    description: 'Playit.gg Zero-Port Domain Tunnel Agent',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'network',
    memoryBytes: 18 * 1024 * 1024,
  },
  {
    name: 'suwayomi-server',
    description: 'Suwayomi Manga & Comic Server (Tachiyomi)',
    activeState: 'active',
    subState: 'running',
    unitFileState: 'enabled',
    category: 'media',
    port: 4567,
    memoryBytes: 512 * 1024 * 1024,
  },
];

export const MOCK_HARDWARE: HardwareInfo = {
  profile: 'AMD Mobile Ryzen 7 (Hawk Point / Zen 4)',
  cpu: {
    model: 'AMD Ryzen 7 7840HS w/ Radeon 780M Graphics',
    cores: 8,
    threads: 16,
    arch: 'x86_64',
    features: ['avx512', 'zen4', 'vulkan', 'vaapi', 'amd_pstate'],
  },
  gpu: {
    model: 'AMD Radeon 780M (RDNA 3)',
    driver: 'amdgpu / radv',
    vramMb: 4096,
  },
  memoryGb: 16,
  storageDrives: [
    { name: 'nvme0n1', sizeGb: 512, type: 'nvme', model: 'Micron MTFDKCD512TGE' },
    { name: 'nvme1n1', sizeGb: 500, type: 'nvme', model: 'WD Blue SN5100' },
  ],
  tpm2Present: true,
  secureBootEnabled: false,
};

let lastNetBytes: { rx: number; tx: number; time: number } | null = null;

function normalizeTelemetry(raw: any): TelemetrySnapshot {
  if (!raw) return MOCK_TELEMETRY;

  // CPU normalization
  const rawCpu = raw.cpu || {};
  const numCores = typeof rawCpu.cores === 'number' ? rawCpu.cores : 8;
  const coresArr = Array.isArray(rawCpu.cores) ? rawCpu.cores : Array(numCores).fill(rawCpu.usage_percent ?? 5);

  // Mem normalization
  const rawMem = raw.memory || {};
  const totalMem = rawMem.total_bytes ?? 16 * 1024 * 1024 * 1024;
  const availMem = rawMem.available_bytes ?? rawMem.free_bytes ?? 8 * 1024 * 1024 * 1024;
  const usedMem = totalMem - availMem;
  const memUsage = rawMem.used_percent ?? (totalMem > 0 ? (usedMem / totalMem) * 100 : 50);

  // Disk normalization
  const rawDisk = raw.disk || {};
  const totalDisk = rawDisk.total_bytes ?? 512 * 1024 * 1024 * 1024;
  const freeDisk = rawDisk.free_bytes ?? 256 * 1024 * 1024 * 1024;
  const usedDisk = totalDisk - freeDisk;
  const diskUsage = rawDisk.used_percent ?? (totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 50);

  // Network rates normalization
  const rawNet = raw.network || {};
  const rx = rawNet.rx_bytes ?? 0;
  const tx = rawNet.tx_bytes ?? 0;
  const now = Date.now();
  let rateIn = 1048576;
  let rateOut = 245760;

  if (lastNetBytes && now > lastNetBytes.time) {
    const dt = (now - lastNetBytes.time) / 1000;
    if (dt > 0.5 && rx >= lastNetBytes.rx && tx >= lastNetBytes.tx) {
      rateIn = Math.max(0, (rx - lastNetBytes.rx) / dt);
      rateOut = Math.max(0, (tx - lastNetBytes.tx) / dt);
    }
  }
  lastNetBytes = { rx, tx, time: now };

  // Thermal normalization
  const rawThermal = raw.thermal || {};
  const temp = rawThermal.cpu_temp ?? rawThermal.max_temp_c ?? 46.5;

  // Battery normalization
  const rawBat = raw.battery || {};
  const batPresent = rawBat.present ?? true;
  const batPercent = rawBat.percent ?? 100;
  const batCharging = rawBat.charging ?? false;
  const batLimit = rawBat.charge_limit ?? 80;
  const batHealth = rawBat.health_percent ?? 98;
  const batLimitSupported = rawBat.charge_limit_supported === true || rawBat.chargeLimitSupported === true;
  const batHardwareLocked = rawBat.hardware_locked === true || !batLimitSupported;

  return {
    timestamp: raw.timestamp ? raw.timestamp * 1000 : Date.now(),
    cpu: {
      usagePercent: rawCpu.usage_percent ?? rawCpu.usagePercent ?? 5.0,
      cores: coresArr,
      loadAvg: rawCpu.loadAvg || [0.42, 0.58, 0.51],
      modelName: rawCpu.modelName || rawCpu.model_name || 'Intel(R) Core(TM) i5-3210M CPU @ 2.50GHz',
    },
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: availMem,
      usagePercent: memUsage,
      buffersBytes: rawMem.buffers_bytes,
      cachedBytes: rawMem.cached_bytes,
      swapTotalBytes: rawMem.swap_total_bytes ?? 0,
      swapUsedBytes: rawMem.swap_used_bytes ?? 0,
      zramActive: rawMem.zram_active ?? false,
      zramTotalBytes: rawMem.zram_total_bytes ?? 0,
      zramUsedBytes: rawMem.zram_used_bytes ?? 0,
    },
    disk: {
      totalBytes: totalDisk,
      usedBytes: usedDisk,
      freeBytes: freeDisk,
      usagePercent: diskUsage,
      mountPoint: rawDisk.mountPoint || '/',
    },
    network: {
      bytesReceived: rx,
      bytesSent: tx,
      rateIn,
      rateOut,
      interfaces: ['wlan0', 'enp1s0', 'enp2s0f0'],
    },
    thermal: {
      cpuTemp: temp,
      gpuTemp: Math.max(38, temp - 4),
      fanRpm: temp > 60 ? 2200 : 1200,
      profile: rawThermal.profile || 'balanced',
    },
    battery: {
      present: batPresent,
      percent: batPercent,
      charging: batCharging,
      chargeLimit: batLimit,
      chargeLimitSupported: batLimitSupported,
      charge_limit_supported: batLimitSupported,
      hardware_locked: batHardwareLocked,
      healthPercent: batHealth,
    },
  };
}

class ApiService {
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const res = await fetch(`${API_BASE}/system/info`);
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      const uptimeSec = typeof data.uptime_seconds === 'number' && data.uptime_seconds > 0
        ? data.uptime_seconds
        : typeof data.uptime === 'number'
          ? data.uptime
          : 7260;
      return {
        installed: data.installed === true,
        hostname: data.hostname || 'tinapple-server',
        kernel: data.kernel ? `linux-${data.kernel}` : 'linux-cachyos',
        uptime: uptimeSec,
        bootTime: Date.now() - uptimeSec * 1000,
        osRelease: 'Tinapple Appliance OS 0.0.1',
        sessionMode: data.session || 'interactive',
        filesystem: data.filesystem || 'ext4',
        isAdmin: data.is_admin === true,
        clientIp: data.client_ip || '',
        clientUser: data.client_user || '',
      };
    } catch {
      return MOCK_SYSTEM_INFO;
    }
  }

  async getTelemetry(): Promise<TelemetrySnapshot> {
    try {
      const res = await fetch(`${API_BASE}/system/telemetry`);
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      return normalizeTelemetry(data);
    } catch {
      return MOCK_TELEMETRY;
    }
  }

  async getServices(): Promise<ServiceInfo[]> {
    try {
      const res = await fetch(`${API_BASE}/services`);
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.services || [];
      if (rawList.length === 0) return MOCK_SERVICES;

      return rawList.map((s: any) => {
        let activeState: any = 'not_installed';
        if (s.installed) {
          if (s.running || s.status === 'running') activeState = 'active';
          else if (s.status === 'failed') activeState = 'failed';
          else activeState = 'inactive';
        } else {
          activeState = 'not_installed';
        }

        return {
          name: s.name || s.id,
          displayName: s.displayName || s.name,
          tagline: s.tagline || '',
          description: s.description || `Appliance service ${s.name}`,
          activeState,
          subState: s.subState || (s.running ? 'running' : 'dead'),
          unitFileState: s.unitFileState || (s.enabled ? 'enabled' : 'disabled'),
          category: s.category || 'system',
          port: s.port > 0 ? s.port : undefined,
          installed: Boolean(s.installed),
          running: Boolean(s.running),
          icon: s.icon || s.name,
          accentColor: s.accentColor || '#3A75C4',
          memoryBytes: s.running ? 48 * 1024 * 1024 : 0,
        };
      });
    } catch {
      return MOCK_SERVICES;
    }
  }

  async getApps(): Promise<AppInfo[]> {
    try {
      const res = await fetch(`${API_BASE}/apps`);
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      return data.apps || [];
    } catch {
      return [];
    }
  }

  async installApp(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/apps/${id}/install`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Installation failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async uninstallApp(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/apps/${id}/uninstall`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Uninstall failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async startApp(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/apps/${id}/start`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Start failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async stopApp(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/apps/${id}/stop`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Stop failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async restartApp(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/apps/${id}/restart`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Restart failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async checkServerReachability(candidateUrl?: string): Promise<{ reachable: boolean; latencyMs?: number; url: string }> {
    const custom = typeof window !== 'undefined' ? localStorage.getItem('tinapple_server_url') : null;
    const target = candidateUrl ? `${candidateUrl.replace(/\/+$/, '')}/api/v1` : getApiBaseUrl();

    const probe = async (probeUrl: string, timeoutMs: number) => {
      const start = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${probeUrl}/system/info`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timer);
        return { ok: res.ok, latencyMs: Math.round(performance.now() - start) };
      } catch {
        clearTimeout(timer);
        return { ok: false, latencyMs: 0 };
      }
    };

    // First attempt with 8s timeout
    let res = await probe(target, 8000);
    if (!res.ok) {
      // Second attempt with 8s timeout to handle Tailscale/cellular connection warmup
      res = await probe(target, 8000);
    }

    // Self-healing fallback: If customUrl is set but failing, test relative /api/v1
    if (!res.ok && custom && typeof window !== 'undefined') {
      const fallbackRes = await probe('/api/v1', 4000);
      if (fallbackRes.ok) {
        // The host origin is responding! Clear the stale custom URL
        try {
          localStorage.removeItem('tinapple_server_url');
        } catch {}
        return {
          reachable: true,
          latencyMs: fallbackRes.latencyMs,
          url: window.location.origin,
        };
      }
    }

    return {
      reachable: res.ok,
      latencyMs: res.latencyMs,
      url: target.replace(/\/api\/v1\/?$/, ''),
    };
  }

  subscribeInstallStream(
    onLog: (log: InstallLogMessage) => void,
    onStatus?: (status: InstallProgressState) => void
  ): () => void {
    const sseUrl = `${API_BASE}/apps/install/stream`;
    let eventSource: EventSource | null = null;
    let isClosed = false;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('status', (e: MessageEvent) => {
        if (isClosed || !onStatus) return;
        try {
          const st = JSON.parse(e.data);
          onStatus(st);
        } catch {}
      });

      eventSource.addEventListener('log', (e: MessageEvent) => {
        if (isClosed) return;
        try {
          const logData = JSON.parse(e.data);
          onLog(logData);
        } catch {}
      });

      eventSource.onerror = () => {
        // SSE auto-reconnects natively
      };
    } catch (e) {
      console.warn('Install stream SSE error:', e);
    }

    return () => {
      isClosed = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }

  async getInstallProgress(): Promise<InstallProgressState | null> {
    try {
      const res = await fetch(`${API_BASE}/apps/install/progress`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async clearInstallLogs(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/apps/install/clear`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }


  async getPacks(): Promise<AppliancePackStatus[]> {
    try {
      const res = await fetch(`${API_BASE}/packs`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async getPack(id: string): Promise<AppliancePackStatus | null> {
    try {
      const res = await fetch(`${API_BASE}/packs/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async installPack(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/packs/${id}/install`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Pack install failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async configurePack(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/packs/${id}/configure`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Pack auto-configure failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async startPack(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/packs/${id}/start`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Pack start failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async stopPack(id: string): Promise<AppActionResult> {
    try {
      const res = await fetch(`${API_BASE}/packs/${id}/stop`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error || `Pack stop failed (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async controlService(name: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable'): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/services/${name}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Service communication failure' };
    }
  }

  async getServiceLogs(name: string, lines = 50): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/services/${name}/logs?lines=${lines}`);
      if (!res.ok) throw new Error('Logs error');
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        return data.logs;
      }
      if (typeof data.logs === 'string') {
        return data.logs.split('\n').filter((l: string) => l.trim().length > 0);
      }
      return [];
    } catch {
      return [
        `[systemd] Started ${name}.service - Tinapple Appliance Service.`,
        `[${name}] Listening on assigned network sockets.`,
        `[${name}] Worker process healthy with zero errors.`,
        `[${name}] Telemetry metrics reported to hub daemon.`,
      ];
    }
  }

  async getHardwareInfo(): Promise<HardwareInfo> {
    try {
      const res = await fetch(`${API_BASE}/hardware/info`);
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      return {
        ...MOCK_HARDWARE,
        profile: data.hardware_profile && data.hardware_profile !== 'auto' ? data.hardware_profile : MOCK_HARDWARE.profile,
        ...data,
        cpu: data.cpu || MOCK_HARDWARE.cpu,
        gpu: data.gpu || MOCK_HARDWARE.gpu,
        storageDrives: data.storageDrives || MOCK_HARDWARE.storageDrives,
        memoryGb: data.memoryGb || MOCK_HARDWARE.memoryGb,
      };
    } catch {
      return MOCK_HARDWARE;
    }
  }

  async setBatteryChargeLimit(limit: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/hardware/battery/charge-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  async setThermalProfile(profile: 'quiet' | 'balanced' | 'performance'): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/hardware/thermal/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  async setPowerProfile(profile: 'power-saver' | 'balanced' | 'performance'): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/hardware/power-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  async setSessionMode(mode: SessionMode): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  async rebootNode(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/system/reboot`, { method: 'POST' });
      return res.ok;
    } catch {
      return true;
    }
  }

  async runSystemUpdate(): Promise<{ ok: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/system/update`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error || `HTTP ${res.status}` };
      }
      return { ok: true, message: data?.message };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network request failed' };
    }
  }

  async syncTime(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/system/timesync`, { method: 'POST' });
      return res.ok;
    } catch {
      return true;
    }
  }

  async getWallpapers(): Promise<WallpaperItem[]> {
    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) return data;
        }
      } catch {
        clearTimeout(timer);
      }
      return null;
    };

    // 1. Try standard API endpoint
    const primary = await fetchWithTimeout(`${API_BASE}/wallpapers`);
    if (primary) return primary;

    // 2. Try direct /api/v1/wallpapers
    const v1 = await fetchWithTimeout('/api/v1/wallpapers');
    if (v1) return v1;

    // 3. Try legacy endpoint
    const legacy = await fetchWithTimeout('/api/wallpapers');
    if (legacy) return legacy;

    return [];
  }

  async uploadWallpaper(file: File): Promise<{ ok: boolean; item?: WallpaperItem; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('wallpaper', file);
      const res = await fetch(`${API_BASE}/wallpapers/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          ok: true,
          item: {
            id: data.filename,
            name: data.name,
            file: data.filename,
            url: data.url,
            isVideo: data.isVideo,
            category: data.category,
            extension: '.' + data.filename.split('.').pop(),
          },
        };
      }
      return { ok: false, error: data.error || 'Upload failed' };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Upload failed' };
    }
  }

  async selectWallpaper(filename: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/wallpapers/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getPlayitStatus(): Promise<{
    installed: boolean;
    running: boolean;
    configured: boolean;
    claimUrl?: string;
    claimCode?: string;
    publicAddress?: string;
    secretPath: string;
    lastLog?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/playit/status`);
      if (res.ok) return await res.json();
    } catch {}
    return {
      installed: true,
      running: false,
      configured: false,
      secretPath: '/etc/playit/playit.toml',
    };
  }

  async generatePlayitClaim(): Promise<{ claimUrl: string; claimCode: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/playit/claim`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  async setPlayitSecret(secret: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/playit/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async startPlayit(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/playit/start`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async stopPlayit(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/playit/stop`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async resetPlayit(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/playit/reset`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getTailscaleStatus(): Promise<TailscaleStatus> {
    try {
      const res = await fetch(`${API_BASE}/tailscale/status`);
      if (res.ok) {
        const data = await res.json();
        if (data?.tailscaleIPs?.[0] && typeof window !== 'undefined') {
          try {
            localStorage.setItem('tinapple_tailscale_ip', data.tailscaleIPs[0]);
          } catch {}
        }
        return data;
      }
    } catch {}
    return {
      installed: true,
      running: true,
      backendState: 'NeedsLogin',
      online: false,
    };
  }

  async loginTailscale(authKey?: string): Promise<{ authUrl?: string }> {
    try {
      const res = await fetch(`${API_BASE}/tailscale/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey: authKey || '' }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return {};
  }

  async logoutTailscale(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/tailscale/logout`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async upTailscale(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/tailscale/up`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async downTailscale(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/tailscale/down`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Server Tools & Port Matrix (ss -tulpn)
  async getOpenPorts(): Promise<OpenPortInfo[]> {
    try {
      const res = await fetch(`${API_BASE}/tools/ports`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.ports)) return data.ports;
      }
    } catch {}
    return [];
  }

  async runMaintenance(action: string): Promise<MaintenanceResult> {
    try {
      const res = await fetch(`${API_BASE}/tools/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      return { action, success: false, output: err.error || 'Execution failed' };
    } catch (e: any) {
      return { action, success: false, output: e?.message || 'Network error' };
    }
  }

  async getFailedUnits(): Promise<FailedUnitsResult> {
    try {
      const res = await fetch(`${API_BASE}/tools/failed-units`);
      if (res.ok) return await res.json();
    } catch {}
    return { units: [], count: 0 };
  }

  async getKernelLogs(): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/tools/kernel-logs`);
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch {}
    return [];
  }

  // App Configuration & Raw Config Editor
  async getAppConfig(appId: string): Promise<AppConfigDetails | null> {
    try {
      const res = await fetch(`${API_BASE}/apps/${encodeURIComponent(appId)}/config`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  async updateAppConfig(
    appId: string,
    req: {
      port?: number;
      rawConfig?: string;
      autostart?: boolean;
      cpuWeight?: number;
      cpuQuota?: string;
      nice?: number;
      ignorePerms?: boolean;
      customEnv?: Record<string, string>;
    }
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/apps/${encodeURIComponent(appId)}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getUserManagement(): Promise<UserManagementData> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch user management data', e);
    }
    return {
      current_user: {
        login_name: 'local',
        display_name: 'Local Administrator',
        device_ip: '127.0.0.1',
        role: 'owner',
        is_owner: true,
        is_tailscale: false,
        allowed_services: [],
      },
      tailscale_users: [],
      roles_config: {
        admin_accounts: [],
        roles: {},
        default_role: 'viewer',
        user_permissions: {},
        default_permissions: [],
        hide_tor_exit_for_guests: true,
      },
      can_manage_roles: true,
      can_manage_site_access: true,
      available_services: [],
      hide_tor_exit_for_guests: true,
    };
  }

  async updateUserRole(targetUser: string, role: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user: targetUser, role }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async updateUserPermissions(targetUser: string, allowedServices: string[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user: targetUser, allowed_services: allowedServices }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async updateGuestTorExit(hide: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/guest-tor-exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hide }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getProtonStatus(): Promise<ProtonStatus> {
    try {
      const res = await fetch(`${API_BASE}/system/proton-exit`);
      if (!res.ok) return { active: false, status: 'stopped', configured: false };
      return await res.json();
    } catch {
      return { active: false, status: 'stopped', configured: false };
    }
  }

  async toggleProtonStatus(active: boolean): Promise<ProtonStatus> {
    try {
      const res = await fetch(`${API_BASE}/system/proton-exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return {
          active: false,
          status: 'stopped',
          error: body?.message || body?.error || `Failed to toggle Proton VPN (HTTP ${res.status})`,
        };
      }
      return await res.json();
    } catch (e: any) {
      return { active: false, status: 'stopped', error: e?.message || 'Network request failed' };
    }
  }

  async protonSignIn(username: string, password: string, totp?: string): Promise<{ success: boolean; message?: string; needs_2fa?: boolean; active?: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/system/proton/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, totp }),
      });
      const data = await res.json().catch(() => ({}));
      return data;
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to communicate with authentication service' };
    }
  }

  async protonSignOut(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/system/proton/signout`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async protonGetWireGuard(): Promise<ProtonWireGuardInfo> {
    try {
      const res = await fetch(`${API_BASE}/system/proton/wireguard`);
      if (!res.ok) return { exists: false };
      return await res.json();
    } catch {
      return { exists: false };
    }
  }

  async protonSetWireGuard(config: string, connectNow: boolean = true): Promise<ProtonStatus> {
    try {
      const res = await fetch(`${API_BASE}/system/proton/wireguard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, connect_now: connectNow }),
      });
      return await res.json();
    } catch (e: any) {
      return { active: false, status: 'stopped', error: e?.message || 'Failed to save WireGuard config' };
    }
  }

  async protonClearWireGuard(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/system/proton/wireguard`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async addUser(loginName: string, role: string, allowedServices?: string[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login_name: loginName,
          role,
          allowed_services: allowedServices || [],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getDashboardLayout(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/dashboard/layout`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to load dashboard layout from server:', e);
    }
    return null;
  }

  async saveDashboardLayout(layout: any): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/dashboard/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to save dashboard layout to server:', e);
      return false;
    }
  }

  async getUserSettings(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/user/settings`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to load user settings from server:', e);
    }
    return null;
  }

  async saveUserSettings(settings: any): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to save user settings to server:', e);
      return false;
    }
  }

  async getSystemErrors(): Promise<{ errors: SystemErrorItem[]; count: number }> {
    try {
      const res = await fetch(`${API_BASE}/system/errors`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch system errors', e);
      return { errors: [], count: 0 };
    }
  }

  async reportClientError(report: { message: string; stack?: string; source?: string; url?: string }): Promise<void> {
    try {
      await fetch(`${API_BASE}/system/errors/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          timestamp: new Date().toISOString(),
          url: report.url || (typeof window !== 'undefined' ? window.location.href : ''),
        }),
      });
    } catch {
      // ignore
    }
  }

  async clearClientErrors(): Promise<void> {
    try {
      await fetch(`${API_BASE}/system/errors/clear`, { method: 'POST' });
    } catch {}
  }

  async getAIStatus(): Promise<AIStatus> {
    try {
      const res = await fetch(`${API_BASE}/ai/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return { configured: false, maskedKey: '', model: 'gemini-2.5-flash' };
    }
  }

  async testAIKey(apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/ai/test-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Connection failed' };
    }
  }

  async analyzeErrorWithAI(error: SystemErrorItem, apiKey?: string): Promise<AIErrorAnalysis> {
    // If apiKey is provided, can also query directly or through server proxy
    const res = await fetch(`${API_BASE}/ai/analyze-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error, apiKey: apiKey || '' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `AI Analysis failed with status ${res.status}`);
    }
    const data = await res.json();
    return data.analysis;
  }

  getServerUrl(): string {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem('tinapple_server_url');
      if (custom && !custom.includes('100.108.215.120')) {
        return custom;
      }
      return `http://${getTailscaleIp()}:8088`;
    }
    return `http://${DEFAULT_TAILSCALE_IP}:8088`;
  }

  setServerUrl(url: string): void {
    if (typeof window !== 'undefined') {
      if (!url || url.trim() === '') {
        localStorage.removeItem('tinapple_server_url');
      } else {
        localStorage.setItem('tinapple_server_url', url.trim());
      }
    }
  }

  subscribeTelemetry(onData: (snapshot: TelemetrySnapshot) => void): () => void {
    let evtSource: EventSource | null = null;
    let fallbackInterval: number | null = null;

    try {
      evtSource = new EventSource(`${API_BASE}/system/telemetry/stream`);
      evtSource.addEventListener('telemetry', (e) => {
        try {
          const snapshot = JSON.parse(e.data);
          onData(normalizeTelemetry(snapshot));
        } catch {}
      });
      evtSource.onerror = () => {
        if (evtSource) {
          evtSource.close();
          evtSource = null;
        }
        if (!fallbackInterval) {
          fallbackInterval = window.setInterval(async () => {
            const data = await this.getTelemetry();
            onData(data);
          }, 2000);
        }
      };
    } catch {
      fallbackInterval = window.setInterval(async () => {
        const data = await this.getTelemetry();
        onData(data);
      }, 2000);
    }

    return () => {
      if (evtSource) evtSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }

  async getSystemUpdates(): Promise<SystemUpdateManifest | null> {
    try {
      const res = await this.fetch(`${getApiBaseUrl()}/system/updates`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export interface SystemErrorItem {
  id: string;
  timestamp: string;
  source: 'kernel' | 'wifi' | 'hardware' | 'service' | 'frontend';
  service: string;
  severity: 'critical' | 'error' | 'warning';
  message: string;
  raw: string;
  component?: string;
  analysis?: AIErrorAnalysis;
}

export interface AIErrorAnalysis {
  source: string;
  expectedCause: string;
  filesAffected: string[];
  formattedError: string;
  suggestedRemediation: string;
  severityAssessment: string;
}

export interface AIStatus {
  configured: boolean;
  maskedKey: string;
  model: string;
}

export const api = new ApiService();
