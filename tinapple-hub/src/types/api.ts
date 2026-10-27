export type SessionMode = 'headless' | 'interactive' | 'kiosk';

export interface SystemInfo {
  installed: boolean;
  hostname: string;
  kernel: string;
  uptime: number; // in seconds
  bootTime: number;
  osRelease: string;
  sessionMode: SessionMode;
  filesystem?: string;
  isAdmin?: boolean;
  clientIp?: string;
  clientUser?: string;
}

export interface TelemetrySnapshot {
  timestamp: number;
  cpu: {
    usagePercent: number;
    cores: number[];
    loadAvg: [number, number, number];
    modelName: string;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
    swapTotalBytes: number;
    swapUsedBytes: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
    mountPoint: string;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    rateIn: number; // bytes/sec
    rateOut: number; // bytes/sec
    interfaces: string[];
  };
  thermal: {
    cpuTemp: number; // Celsius
    gpuTemp?: number;
    fanRpm?: number;
    profile: 'quiet' | 'balanced' | 'performance';
  };
  battery?: {
    present: boolean;
    percent: number;
    charging: boolean;
    chargeLimit: number; // e.g. 80
    healthPercent: number;
  };
}

export interface ServiceInfo {
  name: string;
  displayName?: string;
  tagline?: string;
  description: string;
  activeState: 'active' | 'inactive' | 'failed' | 'activating' | 'deactivating' | 'not_installed';
  subState: string;
  unitFileState: 'enabled' | 'disabled' | 'masked' | 'static' | 'not-found';
  category: 'core' | 'media' | 'database' | 'network' | 'desktop' | 'system' | 'downloads' | 'security' | 'gaming' | 'backups';
  memoryBytes?: number;
  cpuPercent?: number;
  port?: number;
  installed?: boolean;
  running?: boolean;
  icon?: string;
  accentColor?: string;
}

export interface InstallLogMessage {
  timestamp: string;
  level: 'info' | 'command' | 'warn' | 'error' | 'success';
  appId: string;
  message: string;
}

export interface InstallProgressState {
  status: 'idle' | 'running' | 'success' | 'error';
  activeApp: string;
  appName?: string;
  logs: InstallLogMessage[];
}

export interface AppActionResult {
  ok: boolean;
  error?: string;
}

export interface AppInfo {
  id: string;
  name: string;
  description: string;
  tagline: string;
  category: string;
  package: string;
  unit: string;
  binary: string;
  port: number;
  icon: string;
  accentColor: string;
  configPath?: string;
  installed: boolean;
  running: boolean;
  status: 'running' | 'stopped' | 'not_installed' | 'failed' | 'starting';
  loadState?: string;
  activeState?: string;
  subState?: string;
  enabled?: boolean;
  config?: Record<string, string>;
}

export interface HardwareInfo {
  profile: string; // e.g. "Laptop / Convertible" or "Homelab Mini-PC"
  cpu: {
    model: string;
    cores: number;
    threads: number;
    arch: string;
    features: string[];
  };
  gpu?: {
    model: string;
    driver: string;
    vramMb?: number;
  };
  memoryGb: number;
  storageDrives: {
    name: string;
    sizeGb: number;
    type: 'nvme' | 'sata' | 'usb';
    model: string;
  }[];
  tpm2Present: boolean;
  secureBootEnabled: boolean;
}

export interface ApplianceProfile {
  id: string;
  name: string;
  category: string;
  icon: string;
  tagline: string;
  description: string;
  installed: boolean;
  status: 'active' | 'inactive' | 'uninstalled';
  services: string[];
  accentColor: string;
}

export interface TailscaleStatus {
  installed: boolean;
  running: boolean;
  backendState: 'NeedsLogin' | 'Running' | 'Stopped' | 'Starting' | 'NoState' | string;
  authUrl?: string;
  tailscaleIPs?: string[];
  dnsName?: string;
  hostName?: string;
  tailnet?: string;
  online: boolean;
  version?: string;
}

export interface AppliancePack {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  accentColor: string;
  icon: string;
  apps: string[];
  features: string[];
}

export interface AppliancePackStatus extends AppliancePack {
  installedCount: number;
  runningCount: number;
  totalCount: number;
  allInstalled: boolean;
  allRunning: boolean;
  appsStatus?: AppInfo[];
}


