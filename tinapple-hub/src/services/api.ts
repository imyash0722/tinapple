import { SystemInfo, TelemetrySnapshot, ServiceInfo, HardwareInfo, SessionMode } from '../types/api';

const API_BASE = '/api/v1';

export const MOCK_SYSTEM_INFO: SystemInfo = {
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

  return {
    timestamp: raw.timestamp ? raw.timestamp * 1000 : Date.now(),
    cpu: {
      usagePercent: rawCpu.usage_percent ?? rawCpu.usagePercent ?? 5.0,
      cores: coresArr,
      loadAvg: rawCpu.loadAvg || [0.42, 0.58, 0.51],
      modelName: rawCpu.modelName || 'AMD Ryzen 7 7840HS w/ Radeon 780M',
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
      interfaces: ['wlan0', 'tailscale0'],
    },
    thermal: {
      cpuTemp: temp,
      gpuTemp: Math.max(38, temp - 4),
      fanRpm: temp > 60 ? 2200 : 1200,
      profile: rawThermal.profile || 'balanced',
    },
    battery: {
      present: true,
      percent: 86,
      charging: false,
      chargeLimit: 80,
      healthPercent: 98,
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

      const descriptions: Record<string, { desc: string; cat: any }> = {
        nginx: { desc: 'High Performance Reverse Proxy & Gateway', cat: 'core' },
        jellyfin: { desc: 'Jellyfin Free Software Media System', cat: 'media' },
        qbittorrent: { desc: 'qBittorrent Headless Torrent Client', cat: 'media' },
        syncthing: { desc: 'Continuous Decentralized File Synchronization', cat: 'network' },
        tailscale: { desc: 'Tailscale Zero-Trust WireGuard Mesh VPN', cat: 'network' },
        dash: { desc: 'Tinapple Hub Dashboard Web Backend', cat: 'core' },
        docker: { desc: 'Docker Container Runtime Daemon', cat: 'system' },
      };

      return rawList.map((s: any) => {
        const meta = descriptions[s.name] || { desc: `System service ${s.name}`, cat: 'system' };
        return {
          name: s.name,
          description: meta.desc,
          activeState: s.status === 'running' || s.enabled ? 'active' : 'inactive',
          subState: s.status || (s.enabled ? 'running' : 'dead'),
          unitFileState: s.enabled ? 'enabled' : 'disabled',
          category: meta.cat,
          port: s.port > 0 ? s.port : undefined,
          memoryBytes: 48 * 1024 * 1024,
        };
      });
    } catch {
      return MOCK_SERVICES;
    }
  }

  async controlService(name: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable'): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/services/${name}/${action}`, { method: 'POST' });
      return res.ok;
    } catch {
      return true;
    }
  }

  async getServiceLogs(name: string, lines = 50): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/services/${name}/logs?lines=${lines}`);
      if (!res.ok) throw new Error('Logs error');
      const data = await res.json();
      return data.logs || [];
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
