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
    buffersBytes?: number;
    cachedBytes?: number;
    swapTotalBytes: number;
    swapUsedBytes: number;
    zramActive?: boolean;
    zramTotalBytes?: number;
    zramUsedBytes?: number;
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
    chargeLimitSupported?: boolean;
    charge_limit_supported?: boolean;
    hardware_locked?: boolean;
    healthPercent: number;
  };
}

export interface ServiceInfo {
  id?: string;
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
  id?: string;
  timestamp: string;
  level: 'info' | 'command' | 'warn' | 'error' | 'success';
  appId?: string;
  message: string;
}

export interface InstallProgressState {
  status: 'idle' | 'running' | 'success' | 'error';
  activeApp: string;
  appId?: string;
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

export interface DetailedTailscalePeer {
  id: string;
  hostName: string;
  dnsName: string;
  os: string;
  userId: number;
  tailscaleIPs: string[];
  online: boolean;
  shareeNode?: boolean;
  exitNode?: boolean;
  exitNodeOption?: boolean;
  relay?: string;
  rxBytes: number;
  txBytes: number;
  lastSeen?: string;
  active?: boolean;
  userLogin?: string;
  userName?: string;
  isSelf?: boolean;
  pingMs?: number;
  pingLoading?: boolean;
}

export interface DetailedTailscaleStatus extends TailscaleStatus {
  self: DetailedTailscalePeer;
  peers: DetailedTailscalePeer[];
  exitNode: string;
  exitNodeAllowLan: boolean;
  advertiseExitNode: boolean;
  exitNodeApproved?: boolean;
  alwaysOnExitNode?: boolean;
  ssh: boolean;
  shieldsUp: boolean;
  acceptRoutes: boolean;
  preferredDerp: number;
  preferredDerpRegion?: string;
  healthWarnings?: string[];
}

export interface TailscaleNetcheckResult {
  now: string;
  udp: boolean;
  ipv4: boolean;
  ipv6: boolean;
  preferredDerp: number;
  preferredDerpName?: string;
  captivePortal: boolean;
  globalV4?: string;
  globalV6?: string;
  regionLatency: Record<string, number>;
}

export interface TailscalePrefsPayload {
  exitNode?: string;
  exitNodeAllowLan?: boolean;
  advertiseExitNode?: boolean;
  alwaysOnExitNode?: boolean;
  ssh?: boolean;
  shieldsUp?: boolean;
  acceptRoutes?: boolean;
}

export interface TailscalePingResponse {
  target: string;
  success: boolean;
  latency: string;
  ms: number;
  output: string;
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

export interface WallpaperItem {
  id: string;
  name: string;
  file: string;
  url: string;
  isVideo: boolean;
  category: string;
  extension: string;
  size?: number;
}

export interface OpenPortInfo {
  protocol: string;
  address?: string;
  localIp?: string;
  port: number;
  process: string;
  pid: number;
  label?: string;
  webUrl?: string;
}

export interface AppConfigDetails {
  id: string;
  name: string;
  port: number;
  configPath?: string;
  unit: string;
  autostart: boolean;
  rawConfig?: string;
  rawOverride?: string;
  cpuWeight?: number;
  cpuQuota?: string;
  nice?: number;
  ignorePerms?: boolean;
  customEnv?: Record<string, string>;
}

export interface MaintenanceResult {
  action: string;
  success: boolean;
  output: string;
}

export interface FailedUnitsResult {
  units: string[];
  count: number;
}

export interface TailscaleDeviceItem {
  name: string;
  ip: string;
  os: string;
  online: boolean;
}

export interface TailscaleUserItem {
  user_id: number;
  login_name: string;
  display_name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'viewer';
  is_owner: boolean;
  allowed_services: string[];
  devices: TailscaleDeviceItem[];
}

export interface CurrentUserSession {
  user_id?: number;
  login_name: string;
  display_name: string;
  avatar?: string;
  device_name?: string;
  device_ip: string;
  role: 'owner' | 'admin' | 'viewer';
  is_owner: boolean;
  is_tailscale: boolean;
  allowed_services: string[];
}

export interface RolesConfigData {
  admin_accounts: string[];
  roles: Record<string, string>;
  default_role: string;
  user_permissions: Record<string, string[]>;
  default_permissions: string[];
  hide_tor_exit_for_guests: boolean;
}

export interface UserManagementData {
  current_user: CurrentUserSession;
  tailscale_users: TailscaleUserItem[];
  roles_config: RolesConfigData;
  can_manage_roles: boolean;
  can_manage_site_access: boolean;
  available_services: {
    id: string;
    name: string;
    icon: string;
    description: string;
  }[];
  hide_tor_exit_for_guests: boolean;
}

export interface ProtonStatus {
  active: boolean;
  status: 'running' | 'stopped' | 'unconfigured';
  autostart?: boolean;
  configured?: boolean;
  tunnel_type?: 'wireguard' | 'proton_cli' | 'none';
  wireguard_config_exists?: boolean;
  is_logged_in?: boolean;
  account_name?: string | null;
  exit_ip?: string;
  country?: string;
  city?: string;
  org?: string;
  details?: string;
  message?: string;
  error?: string;
  routed_services?: string[];
  success?: boolean;
}

export interface ProtonWireGuardInfo {
  exists: boolean;
  address?: string;
  dns?: string;
  endpoint?: string;
  error?: string;
}

export interface SystemUpdateManifest {
  available: boolean;
  latest_sha?: string;
  short_sha?: string;
  message?: string;
  author?: string;
  date?: string;
  url?: string;
  checked_at?: string;
}

export interface ProtonProfileMeta {
  id: string;
  name: string;
  fileName: string;
  countryCode: string;
  country: string;
  serverLabel: string;
  endpoint: string;
  endpointHost: string;
  address: string;
  dns: string;
  freeTier: boolean;
  p2pSupported: boolean;
  updatedAt: string;
}

export interface NetworkerProtonState {
  enabled: boolean;
  active: boolean;
  configured: boolean;
  activeProfileId?: string;
  endpoint?: string;
  exitIp?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  org?: string;
  freeTier: boolean;
  p2pSupported: boolean;
  latestHandshake?: number;
  rxBytes?: number;
  txBytes?: number;
  profiles: ProtonProfileMeta[];
}

export interface NetworkerTorState {
  enabled: boolean;
  active: boolean;
  bootstrapped: boolean;
  exitIp?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  error?: string;
}

export type NetworkRouteMode = 'direct' | 'protonvpn' | 'tor';

export interface NetworkerTarget {
  id: string;
  name: string;
  subtitle: string;
  kind: 'interface' | 'systemd' | 'docker' | string;
  unit?: string;
  iface?: string;
  category: string;
  p2pRisk: boolean;
  p2pWarning?: string;
  extraNote?: string;
  mode: NetworkRouteMode;
  effectiveMode?: NetworkRouteMode | string;
  p2pWarningActive: boolean;
  conflictBlocked?: boolean;
}

export interface NetworkerStatus {
  proton: NetworkerProtonState;
  tor: NetworkerTorState;
  targets: NetworkerTarget[];
  warnings?: string[];
  updatedAt?: string;
  error?: string;
}






