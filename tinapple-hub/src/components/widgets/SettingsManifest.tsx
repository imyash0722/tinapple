import React, { useState, useMemo } from 'react';
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Server,
  Network,
  Lock,
  BatteryCharging,
  Cpu,
  Layers,
  HardDrive,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { SquishSwitch } from '../reactbits/SquishSwitch';
import HoldButton from '../reactbits/HoldButton';
import { SystemInfo, SessionMode } from '../../types/api';
import { TailscaleUserManager } from './TailscaleUserManager';

interface SettingsManifestProps {
  systemInfo: SystemInfo;
  onUpdateSession: (mode: SessionMode) => Promise<void>;
}

interface ValidationErrors {
  hostname?: string;
  webPort?: string;
  sshPort?: string;
  staticIp?: string;
  gatewayIp?: string;
  dnsIp?: string;
  storageThreshold?: string;
  batteryLimit?: string;
  password?: string;
}

export const SettingsManifest: React.FC<SettingsManifestProps> = ({
  systemInfo,
  onUpdateSession,
}) => {
  // Core System Manifest State
  const [hostname, setHostname] = useState<string>(systemInfo.hostname || 'tinapple-server');
  const [kernel, setKernel] = useState<string>('linux-lts');
  const [bootloader, setBootloader] = useState<string>('grub');
  const [sessionMode, setSessionMode] = useState<SessionMode>(systemInfo.sessionMode || 'headless');
  const [enableCachyOS, setEnableCachyOS] = useState<boolean>(true);
  const [enableEaseOfUse, setEnableEaseOfUse] = useState<boolean>(true);

  // Network & Ports Configuration State
  const [webPort, setWebPort] = useState<string>('8088');
  const [sshPort, setSshPort] = useState<string>('22');
  const [ipMode, setIpMode] = useState<'dhcp' | 'static'>('dhcp');
  const [staticIp, setStaticIp] = useState<string>('');
  const [gatewayIp, setGatewayIp] = useState<string>('');
  const [dnsIp, setDnsIp] = useState<string>('1.1.1.1');

  // Governance & Hardware Protection Thresholds
  const [storageThreshold, setStorageThreshold] = useState<string>('85');
  const [batteryLimit, setBatteryLimit] = useState<string>('80');

  // Admin Security Password Override (Optional)
  const [changePassword, setChangePassword] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status feedback
  const [saved, setSaved] = useState<boolean>(false);
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load real server manifest config on mount
  React.useEffect(() => {
    const loadLiveConfig = async () => {
      try {
        const res = await fetch('/api/v1/config');
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.hostname) setHostname(cfg.hostname);
          if (cfg.kernel_profile) {
            setKernel(cfg.kernel_profile.includes('lts') ? 'linux-lts' : 'linux-cachyos');
          }
          if (cfg.bootloader) {
            setBootloader(cfg.bootloader.includes('grub') ? 'grub' : 'limine');
          }
          if (cfg.session_mode) setSessionMode(cfg.session_mode);
          if (cfg.cachyos_repos !== undefined) setEnableCachyOS(cfg.cachyos_repos);
          if (cfg.ease_of_use_mode !== undefined) setEnableEaseOfUse(cfg.ease_of_use_mode);
          if (cfg.hardware?.battery?.charge_limit) {
            setBatteryLimit(String(cfg.hardware.battery.charge_limit));
          }
          if (cfg.network) {
            setIpMode(cfg.network.dhcp ? 'dhcp' : 'static');
            if (cfg.network.static_fallback?.address) {
              setStaticIp(cfg.network.static_fallback.address);
            }
            if (cfg.network.static_fallback?.gateway) {
              setGatewayIp(cfg.network.static_fallback.gateway);
            }
            if (cfg.network.static_fallback?.dns?.[0]) {
              setDnsIp(cfg.network.static_fallback.dns[0]);
            }
          }
        }
      } catch (e) {
        console.warn('Could not load live manifest config', e);
      }
    };
    loadLiveConfig();
  }, []);

  // ================= STRICT INPUT VALIDATION RULES =================
  const errors = useMemo<ValidationErrors>(() => {
    const errs: ValidationErrors = {};

    // 1. Hostname validation (RFC 1123)
    const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
    if (!hostname.trim()) {
      errs.hostname = 'Hostname cannot be empty.';
    } else if (hostname.length > 63) {
      errs.hostname = 'Hostname cannot exceed 63 characters.';
    } else if (!hostnameRegex.test(hostname)) {
      errs.hostname =
        'Hostname can only contain alphanumeric characters and hyphens, and cannot start or end with a hyphen.';
    }

    // 2. Web Port validation
    const wPort = parseInt(webPort, 10);
    if (!webPort.trim() || isNaN(wPort)) {
      errs.webPort = 'Web port is required.';
    } else if (wPort < 1 || wPort > 65535) {
      errs.webPort = 'Port must be an integer between 1 and 65535.';
    }

    // 3. SSH Port validation
    const sPort = parseInt(sshPort, 10);
    if (!sshPort.trim() || isNaN(sPort)) {
      errs.sshPort = 'SSH port is required.';
    } else if (sPort < 1 || sPort > 65535) {
      errs.sshPort = 'Port must be an integer between 1 and 65535.';
    } else if (sPort === wPort) {
      errs.sshPort = 'SSH port cannot conflict with Web Hub port.';
    }

    // 4. IPv4 Helpers
    const isValidIpv4 = (ip: string): boolean => {
      const parts = ip.split('.');
      if (parts.length !== 4) return false;
      return parts.every((p) => {
        if (!/^\d+$/.test(p)) return false;
        const n = parseInt(p, 10);
        return n >= 0 && n <= 255 && (p === '0' || !p.startsWith('0'));
      });
    };

    if (ipMode === 'static') {
      if (!staticIp.trim()) {
        errs.staticIp = 'Static IP address is required when static mode is selected.';
      } else if (!isValidIpv4(staticIp.trim())) {
        errs.staticIp = 'Invalid IPv4 address format (e.g. 192.168.1.150).';
      }

      if (gatewayIp.trim() && !isValidIpv4(gatewayIp.trim())) {
        errs.gatewayIp = 'Invalid Gateway IPv4 address format (e.g. 192.168.1.1).';
      }

      if (dnsIp.trim() && !isValidIpv4(dnsIp.trim())) {
        errs.dnsIp = 'Invalid Primary DNS IPv4 address format (e.g. 1.1.1.1).';
      }
    }

    // 5. Storage Alert Threshold
    const stVal = parseInt(storageThreshold, 10);
    if (!storageThreshold.trim() || isNaN(stVal)) {
      errs.storageThreshold = 'Storage alert threshold is required.';
    } else if (stVal < 50 || stVal > 98) {
      errs.storageThreshold = 'Threshold percentage must be between 50% and 98%.';
    }

    // 6. Battery Limit Threshold
    const batVal = parseInt(batteryLimit, 10);
    if (!batteryLimit.trim() || isNaN(batVal)) {
      errs.batteryLimit = 'Battery charge limit is required.';
    } else if (batVal < 50 || batVal > 100) {
      errs.batteryLimit = 'Battery threshold percentage must be between 50% and 100%.';
    }

    // 7. Password validation (if enabled)
    if (changePassword) {
      if (!newPassword) {
        errs.password = 'New administrator password cannot be empty.';
      } else if (newPassword.length < 6) {
        errs.password = 'Password must be at least 6 characters long.';
      } else if (newPassword !== confirmPassword) {
        errs.password = 'Passwords do not match.';
      }
    }

    return errs;
  }, [
    hostname,
    webPort,
    sshPort,
    ipMode,
    staticIp,
    gatewayIp,
    dnsIp,
    storageThreshold,
    batteryLimit,
    changePassword,
    newPassword,
    confirmPassword,
  ]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = async () => {
    setSubmitAttempted(true);
    setSaveError(null);

    if (hasErrors) {
      setSaveError('Cannot deploy manifest: please correct the highlighted validation errors.');
      return;
    }

    try {
      await onUpdateSession(sessionMode);

      // Persist to backend manifest API
      const payload = {
        hostname: hostname.trim().toLowerCase(),
        kernel,
        bootloader,
        session_mode: sessionMode,
        cachyos_repos: enableCachyOS,
        hardware_tuning: enableEaseOfUse,
        web_port: parseInt(webPort, 10),
        ssh_port: parseInt(sshPort, 10),
        network: {
          mode: ipMode,
          static_ip: staticIp.trim(),
          gateway: gatewayIp.trim(),
          dns: dnsIp.trim(),
        },
        thresholds: {
          storage_percent: parseInt(storageThreshold, 10),
          battery_charge_limit: parseInt(batteryLimit, 10),
        },
      };

      const res = await fetch('/api/v1/system/manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && !res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error status ${res.status}`);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to apply system manifest.');
    }
  };

  return (
    <div className="space-y-6">
      <SpotlightCard
        className="p-6 bg-[#0e1116] border-[#353c4a]"
        spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.15)"
        borderColor="rgb(var(--tinapple-accent-rgb) / 0.45)"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 shadow-md shadow-tinapple-gold/10">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight font-mono uppercase">
                  SYSTEM MANIFEST ENGINE
                </h2>
              </div>
              <p className="text-xs text-tinapple-subtext font-mono mt-0.5">
                Validates and compiles parameters into <code className="text-tinapple-gold">/etc/tinapple/manifest.yaml</code>
              </p>
            </div>
          </div>

          {/* Validation Status Indicator */}
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 font-mono text-xs font-bold animate-pulse">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{Object.keys(errors).length} Validation Errors</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified Clean</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Alert Banner for Errors or Success */}
        {hasErrors && submitAttempted && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs font-mono">
              <span className="font-bold text-red-300 block mb-1">
                Manifest Verification Failed:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-red-200/90">
                {Object.entries(errors).map(([field, msg]) => (
                  <li key={field}>
                    <strong className="capitalize">{field.replace(/([A-Z])/g, ' $1')}:</strong> {msg}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {saveError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-xs font-mono text-red-200 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saved && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>System Manifest successfully deployed and applied! Daemons reloading...</span>
          </div>
        )}

        {/* LIVE CONNECTIVITY & HARDWARE STATE */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              <span>Active Server Links & Remote Access</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              Live Appliance
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Tailscale Mesh</span>
              <span className="text-emerald-300 font-bold text-xs">100.86.103.100</span>
              <span className="text-[10px] text-emerald-500/80 block mt-0.5">● Connected & Encrypted</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Wi-Fi Hotspot Link</span>
              <span className="text-blue-300 font-bold text-xs">10.178.125.71</span>
              <span className="text-[10px] text-blue-400/80 block mt-0.5">● Redmi Note 9 Pro Max</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">UFW Firewall</span>
              <span className="text-purple-300 font-bold text-xs">Active & Enforced</span>
              <span className="text-[10px] text-purple-400/80 block mt-0.5">Tailscale & Hotspot Allowed</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: SYSTEM IDENTITY & CORE */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-tinapple-gold font-mono uppercase tracking-wider mb-3 pb-1 border-b border-tinapple-border/50">
            <Server className="w-4 h-4" />
            <span>1. Identity & Operating Core</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            {/* Hostname with inline validation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Appliance Hostname <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-tinapple-muted">RFC 1123 compliant</span>
              </div>
              <input
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value.toLowerCase())}
                placeholder="e.g. tinapple-appliance"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                  errors.hostname
                    ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                    : 'border-tinapple-border focus:border-tinapple-gold'
                }`}
              />
              {errors.hostname && (
                <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.hostname}</span>
                </div>
              )}
            </div>


            {/* Display Session Mode (Niri Wayland Station) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Session Mode (Niri Wayland / Headless)
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border">
                {(['headless', 'interactive', 'kiosk'] as SessionMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSessionMode(mode)}
                    className={`py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                      sessionMode === mode
                        ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                        : 'text-tinapple-subtext hover:text-white'
                    }`}
                  >
                    {mode === 'interactive' ? 'Niri Wayland' : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: NETWORKING & PORTS */}
        <div className="mb-6 pt-5 border-t border-tinapple-border/70">
          <div className="flex items-center gap-2 text-xs font-bold text-tinapple-gold font-mono uppercase tracking-wider mb-3 pb-1 border-b border-tinapple-border/50">
            <Network className="w-4 h-4" />
            <span>2. Network Gateway & Service Ports</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            {/* Web Hub Port */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Web Hub Dashboard Port <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="65535"
                value={webPort}
                onChange={(e) => setWebPort(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                  errors.webPort
                    ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                    : 'border-tinapple-border focus:border-tinapple-gold'
                }`}
              />
              {errors.webPort && (
                <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.webPort}</span>
                </div>
              )}
            </div>

            {/* SSH Daemon Port */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                OpenSSH Server Port <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="65535"
                value={sshPort}
                onChange={(e) => setSshPort(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                  errors.sshPort
                    ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                    : 'border-tinapple-border focus:border-tinapple-gold'
                }`}
              />
              {errors.sshPort && (
                <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.sshPort}</span>
                </div>
              )}
            </div>

            {/* IP Assignment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                IP Address Assignment
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIpMode('dhcp')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    ipMode === 'dhcp'
                      ? 'bg-tinapple-gold text-tinapple-dark border-tinapple-gold'
                      : 'bg-tinapple-dark/60 text-tinapple-subtext border-tinapple-border hover:text-white'
                  }`}
                >
                  Dynamic (DHCP)
                </button>
                <button
                  type="button"
                  onClick={() => setIpMode('static')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    ipMode === 'static'
                      ? 'bg-tinapple-gold text-tinapple-dark border-tinapple-gold'
                      : 'bg-tinapple-dark/60 text-tinapple-subtext border-tinapple-border hover:text-white'
                  }`}
                >
                  Static IP
                </button>
              </div>
            </div>

            {/* Static IP configuration fields */}
            {ipMode === 'static' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Static IPv4 Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={staticIp}
                    onChange={(e) => setStaticIp(e.target.value)}
                    placeholder="e.g. 192.168.1.150"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                      errors.staticIp
                        ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                        : 'border-tinapple-border focus:border-tinapple-gold'
                    }`}
                  />
                  {errors.staticIp && (
                    <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.staticIp}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Default Gateway IPv4
                  </label>
                  <input
                    type="text"
                    value={gatewayIp}
                    onChange={(e) => setGatewayIp(e.target.value)}
                    placeholder="e.g. 192.168.1.1"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                      errors.gatewayIp
                        ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                        : 'border-tinapple-border focus:border-tinapple-gold'
                    }`}
                  />
                  {errors.gatewayIp && (
                    <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.gatewayIp}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Primary DNS Server
                  </label>
                  <input
                    type="text"
                    value={dnsIp}
                    onChange={(e) => setDnsIp(e.target.value)}
                    placeholder="e.g. 1.1.1.1"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                      errors.dnsIp
                        ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                        : 'border-tinapple-border focus:border-tinapple-gold'
                    }`}
                  />
                  {errors.dnsIp && (
                    <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.dnsIp}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION 3: HARDWARE GOVERNANCE & THRESHOLDS */}
        <div className="mb-6 pt-5 border-t border-tinapple-border/70">
          <div className="flex items-center gap-2 text-xs font-bold text-tinapple-gold font-mono uppercase tracking-wider mb-3 pb-1 border-b border-tinapple-border/50">
            <BatteryCharging className="w-4 h-4" />
            <span>3. Hardware Governance & Protection Thresholds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            {/* Battery Charge Limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Battery Charge Ceiling (%) <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-tinapple-muted">Range: 50% - 100%</span>
              </div>
              <input
                type="number"
                min="50"
                max="100"
                value={batteryLimit}
                onChange={(e) => setBatteryLimit(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                  errors.batteryLimit
                    ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                    : 'border-tinapple-border focus:border-tinapple-gold'
                }`}
              />
              {errors.batteryLimit && (
                <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.batteryLimit}</span>
                </div>
              )}
            </div>

            {/* Storage Usage Warning Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Disk Alert Threshold (%) <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-tinapple-muted">Range: 50% - 98%</span>
              </div>
              <input
                type="number"
                min="50"
                max="98"
                value={storageThreshold}
                onChange={(e) => setStorageThreshold(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                  errors.storageThreshold
                    ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                    : 'border-tinapple-border focus:border-tinapple-gold'
                }`}
              />
              {errors.storageThreshold && (
                <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.storageThreshold}</span>
                </div>
              )}
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
              <div>
                <span className="text-xs font-bold text-white block">
                  CachyOS v3/v4 Repositories
                </span>
                <span className="text-[11px] text-tinapple-subtext font-mono">
                  Enables AVX-512 & BORE scheduler optimized package mirrors.
                </span>
              </div>
              <SquishSwitch checked={enableCachyOS} onChange={setEnableCachyOS} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
              <div>
                <span className="text-xs font-bold text-white block">
                  Automated Acoustic & Battery Tuning
                </span>
                <span className="text-[11px] text-tinapple-subtext font-mono">
                  Auto-adjusts battery health caps and quiet thermal fan curves.
                </span>
              </div>
              <SquishSwitch checked={enableEaseOfUse} onChange={setEnableEaseOfUse} />
            </div>
          </div>
        </div>

        {/* SECTION 4: SECURITY CREDENTIALS */}
        <div className="mb-6 pt-5 border-t border-tinapple-border/70">
          <div className="flex items-center justify-between mb-3 pb-1 border-b border-tinapple-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-tinapple-gold font-mono uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              <span>4. Root & Administrator Security Credentials</span>
            </div>
            <SquishSwitch checked={changePassword} onChange={setChangePassword} />
          </div>

          {changePassword && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  New Admin Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors pr-10 ${
                      errors.password
                        ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                        : 'border-tinapple-border focus:border-tinapple-gold'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-tinapple-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border text-xs text-white focus:outline-none transition-colors ${
                    errors.password
                      ? 'border-red-500 bg-red-500/10 focus:border-red-400'
                      : 'border-tinapple-border focus:border-tinapple-gold'
                  }`}
                />
              </div>

              {errors.password && (
                <div className="col-span-full text-[11px] text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls & HoldButton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-tinapple-border/70">
          <div className="text-[11px] font-mono text-tinapple-muted flex items-center gap-2">
            {hasErrors ? (
              <span className="text-red-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Resolve {Object.keys(errors).length} invalid fields to apply manifest
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                All configuration constraints verified
              </span>
            )}
          </div>

          <div className="w-full sm:w-auto">
            {hasErrors ? (
              <button
                type="button"
                onClick={() => setSubmitAttempted(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 font-mono text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Fix Validation Errors to Deploy</span>
              </button>
            ) : (
              <HoldButton
                backgroundColor="#15181f"
                fillColor="#7ec789"
                textColor="#ffffff"
                fillTextColor="#060709"
                size="md"
                holdTime={1400}
                wave={true}
                glow={true}
                doneLabel="Manifest Verified & Applied!"
                onHold={handleSave}
                className="w-full sm:w-auto font-mono text-xs font-bold"
              >
                Hold to Deploy & Apply Manifest
              </HoldButton>
            )}
          </div>
        </div>
      </SpotlightCard>

      {/* 2. Tailscale Mesh Identity & Role-Based Access Control (RBAC) */}
      <TailscaleUserManager />
    </div>
  );
};

export default SettingsManifest;
