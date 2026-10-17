export type SessionMode = 'headless' | 'interactive' | 'kiosk';

export interface SystemInfo {
  hostname: string;
  kernel: string;
  uptime: number; // in seconds
  bootTime: number;
  osRelease: string;
  sessionMode: SessionMode;
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
  description: string;
  activeState: 'active' | 'inactive' | 'failed' | 'activating' | 'deactivating';
  subState: string;
  unitFileState: 'enabled' | 'disabled' | 'masked' | 'static';
  category: 'core' | 'media' | 'database' | 'network' | 'desktop' | 'system';
  memoryBytes?: number;
  cpuPercent?: number;
  port?: number;
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
