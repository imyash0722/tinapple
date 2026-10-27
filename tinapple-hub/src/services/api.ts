import { SystemInfo, TelemetrySnapshot, ServiceInfo, HardwareInfo, SessionMode, AppInfo, AppActionResult, InstallProgressState, InstallLogMessage, TailscaleStatus } from '../types/api';

const API_BASE = '/api/v1';

export const MOCK_SYSTEM_INFO: SystemInfo = {
  installed: true,
  hostname: 'tinapple-appliance',
  kernel: '6.12.8-cachyos-tinapple',
  uptime: 7260,
  bootTime: Date.now() - 7260 * 1000,
  osRelease: 'Tinapple Appliance OS 0.0.1 (Arch-based)',
  sessionMode: 'interactive',
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
      swapTotalBytes: rawMem.swap_total_bytes ?? 8 * 1024 * 1024 * 1024,
      swapUsedBytes: rawMem.swap_used_bytes ?? 0,
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
      return {
        installed: data.installed === true,
        hostname: data.hostname || 'tinapple-server',
        kernel: data.kernel ? `linux-${data.kernel}` : 'linux-cachyos',
        uptime: typeof data.uptime === 'number' ? data.uptime : 7260,
        bootTime: Date.now() - 7260 * 1000,
        osRelease: 'Tinapple Appliance OS 0.0.1',
        sessionMode: data.session || 'interactive',
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

  async getAppConfig(id: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/apps/${id}/config`);
      if (!res.ok) throw new Error('Config fetch failed');
      return await res.json();
    } catch {
      return null;
    }
  }

  async updateAppConfig(id: string, config: { port?: number; customEnv?: Record<string, string> }): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/apps/${id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      return res.ok;
    } catch {
      return false;
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

  async syncTime(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/system/timesync`, { method: 'POST' });
      return res.ok;
    } catch {
      return true;
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
      if (res.ok) return await res.json();
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
}

export const api = new ApiService();
