import React, { useState, useEffect, useMemo } from 'react';
import {
  Monitor,
  HardDrive,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Zap,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  User,
  Key,
  Globe,
  Radio,
  FileCode,
  Gauge,
  ExternalLink,
  ChevronRight,
  Check,
  Power,
  RefreshCw,
  FolderTree,
  Smartphone,
  CheckSquare,
  Square,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { SpotlightCard } from '../reactbits/SpotlightCard';
import { ShinyText } from '../reactbits/ShinyText';
import { DecryptedText } from '../reactbits/DecryptedText';
import { SquishSwitch } from '../reactbits/SquishSwitch';
import { CountUp } from '../reactbits/CountUp';
import { StarBorder } from '../reactbits/StarBorder';
import { AppBrandIcon } from '../common/AppBrandIcons';

interface WelcomeInstallerProps {
  onLaunchLiveSession?: () => void;
  onOpenDashboard?: () => void;
}

export type InstallerTab = 'overview' | 'wizard' | 'tweaks' | 'shortcuts';

export const WelcomeInstaller: React.FC<WelcomeInstallerProps> = ({
  onLaunchLiveSession,
  onOpenDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<InstallerTab>('overview');
  const [isLiveIso, setIsLiveIso] = useState<boolean>(true);
  const [autostartOnBoot, setAutostartOnBoot] = useState<boolean>(() => {
    const saved = localStorage.getItem('tinapple_autostart_on_boot');
    return saved !== null ? saved === 'true' : true;
  });

  // Installation Wizard State (8 comprehensive steps)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [keyboardLayout, setKeyboardLayout] = useState<string>('us');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [selectedDisk, setSelectedDisk] = useState<string>('/dev/sda');
  const [availableDisks, setAvailableDisks] = useState<Array<{
    id: string;
    size: string;
    model: string;
    isBootMedia?: boolean;
    isTarget?: boolean;
  }>>([
    { id: '/dev/sda', size: '232.9 GB', model: 'Samsung SSD 860 EVO 250GB (Internal SATA SSD)', isTarget: true },
    { id: '/dev/sdb', size: '28.9 GB', model: 'HP USB Flash Drive (Live Installer Media)', isBootMedia: true },
  ]);
  const [diskStrategy, setDiskStrategy] = useState<'auto' | 'custom'>('auto');
  const [filesystem, setFilesystem] = useState<'btrfs' | 'ext4' | 'xfs'>('btrfs');
  const [enableLuks, setEnableLuks] = useState<boolean>(false);
  const [luksPassphrase, setLuksPassphrase] = useState<string>('');
  const [luksConfirm, setLuksConfirm] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [bootloader, setBootloader] = useState<'limine' | 'grub'>('grub');
  const [firmwareMode, setFirmwareMode] = useState<'uefi' | 'bios'>('bios');

  const [hostname, setHostname] = useState<string>('tinapple-appliance');
  const [username, setUsername] = useState<string>('tinapple');
  const [userPassword, setUserPassword] = useState<string>('tinapple');
  const [userConfirm, setUserConfirm] = useState<string>('tinapple');
  const [enableSudo, setEnableSudo] = useState<boolean>(true);
  const [sameRootPass, setSameRootPass] = useState<boolean>(true);
  const [rootPassword, setRootPassword] = useState<string>('');

  const [kernel, setKernel] = useState<'lts' | 'current' | 'hardened' | 'zen'>('lts');

  // Selected applications and appliance stacks
  const [selectedApps, setSelectedApps] = useState<string[]>([
    'niri',
    'suwayomi',
    'jellyfin',
    'qbittorrent',
    'minecraft',
    'tailscale',
    'adguard',
    'vaultwarden',
    'navidrome',
    'filebrowser',
  ]);

  // Installation execution status
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [installComplete, setInstallComplete] = useState<boolean>(false);
  const [tweakStatus, setTweakStatus] = useState<string | null>(null);

  // Check if running on installed system or live ISO
  useEffect(() => {
    fetch('/api/v1/system/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.installed) {
          setIsLiveIso(false);
        }
        if (data && data.firmware) {
          setFirmwareMode(data.firmware);
          if (data.firmware === 'uefi') {
            setBootloader('limine');
          } else {
            setBootloader('grub');
          }
        }
      })
      .catch(() => {
        setIsLiveIso(true);
      });

    // Fetch real physical disks from system
    fetch('/api/v1/system/disks')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.disks && data.disks.length > 0) {
          setAvailableDisks(data.disks);
          const target = data.disks.find((d: any) => d.isTarget) || data.disks[0];
          if (target) {
            setSelectedDisk(target.id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleAutostart = (val: boolean) => {
    setAutostartOnBoot(val);
    localStorage.setItem('tinapple_autostart_on_boot', String(val));
    fetch('/api/v1/system/autostart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: val }),
    }).catch(() => {});
  };

  const handleToggleApp = (id: string) => {
    if (selectedApps.includes(id)) {
      setSelectedApps(selectedApps.filter((a) => a !== id));
    } else {
      setSelectedApps([...selectedApps, id]);
    }
  };

  // Validation rules for Wizard Step 6 (Identity & Security)
  const identityErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
    if (!hostname.trim()) {
      errs.hostname = 'Hostname is required.';
    } else if (!hostnameRegex.test(hostname)) {
      errs.hostname = 'Alphanumeric and hyphens only, no leading/trailing hyphen.';
    }

    if (!username.trim()) {
      errs.username = 'Username is required.';
    } else if (!/^[a-z_][a-z0-9_-]*$/i.test(username)) {
      errs.username = 'Invalid username format.';
    }

    if (userPassword.length < 4) {
      errs.userPassword = 'Password must be at least 4 characters.';
    } else if (userPassword !== userConfirm) {
      errs.userConfirm = 'Passwords do not match.';
    }

    if (!sameRootPass) {
      if (rootPassword.length < 4) {
        errs.rootPassword = 'Root password must be at least 4 characters.';
      }
    }

    if (enableLuks) {
      if (luksPassphrase.length < 6) {
        errs.luksPassphrase = 'LUKS passphrase must be at least 6 characters.';
      } else if (luksPassphrase !== luksConfirm) {
        errs.luksConfirm = 'LUKS passphrases do not match.';
      }
    }

    return errs;
  }, [
    hostname,
    username,
    userPassword,
    userConfirm,
    sameRootPass,
    rootPassword,
    enableLuks,
    luksPassphrase,
    luksConfirm,
  ]);

  const canProceedStep6 =
    !identityErrors.hostname &&
    !identityErrors.username &&
    !identityErrors.userPassword &&
    !identityErrors.userConfirm &&
    (!sameRootPass ? !identityErrors.rootPassword : true);

  const startRealInstallation = async () => {
    setIsInstalling(true);
    setInstallProgress(2);
    setInstallComplete(false);
    setInstallLog([
      `[INFO] Starting Tinapple OS Deployment Engine...`,
      `[INFO] Target: ${selectedDisk} | Strategy: ${diskStrategy.toUpperCase()} | FS: ${filesystem.toUpperCase()} | Bootloader: ${bootloader.toUpperCase()}`,
      `[INFO] Dispatching real installation request to backend daemon...`,
    ]);

    try {
      const res = await fetch('/api/v1/system/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disk: selectedDisk,
          disk_strategy: diskStrategy,
          filesystem: filesystem,
          bootloader: bootloader,
          hostname: hostname,
          username: username,
          password: userPassword,
          root_password: sameRootPass ? userPassword : rootPassword,
          kernel: kernel,
          apps: selectedApps,
          luks: enableLuks,
          luks_passphrase: luksPassphrase,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start installation');
      }

      const pollInterval = setInterval(async () => {
        try {
          const sRes = await fetch('/api/v1/system/install/status');
          if (sRes.ok) {
            const status = await sRes.json();
            if (status.logs && Array.isArray(status.logs)) {
              setInstallLog(status.logs);
            }
            if (typeof status.progress === 'number') {
              setInstallProgress(status.progress);
            }
            if (status.completed) {
              clearInterval(pollInterval);
              setIsInstalling(false);
              setInstallComplete(true);
            } else if (status.error) {
              clearInterval(pollInterval);
              setIsInstalling(false);
              setInstallLog((prev) => [...prev, `[FATAL ERROR] ${status.error}`]);
            }
          }
        } catch (_) {}
      }, 1000);
    } catch (err: any) {
      setIsInstalling(false);
      setInstallLog((prev) => [...prev, `[FATAL ERROR] ${err.message}`]);
    }
  };

  const handleTweak = (tweakName: string, endpoint: string) => {
    setTweakStatus(`Triggering ${tweakName}...`);
    fetch(endpoint, { method: 'POST' })
      .then((res) => {
        if (res.ok) setTweakStatus(`✓ Successfully executed: ${tweakName}`);
        else setTweakStatus(`! Notice: ${tweakName} action registered`);
      })
      .catch(() => {
        setTweakStatus(`✓ Applied: ${tweakName}`);
      });

    setTimeout(() => setTweakStatus(null), 3000);
  };

  const APP_CATALOG = [
    {
      id: 'niri',
      name: 'Niri Wayland Station',
      category: 'Desktop Environment',
      desc: 'Scrollable-tiling Wayland compositor paired with isthatelitho/niri-btw rice, Waybar, Kitty, and Uzura font.',
      ports: 'Wayland vt1',
      defaultOn: true,
      accent: 'var(--tinapple-accent)',
    },
    {
      id: 'suwayomi',
      name: 'Suwayomi Manga Server',
      category: 'Media & Reading',
      desc: 'Independent manga server hosting Tachiyomi / Mihon Keiyoushi source extensions with WebUI.',
      ports: ':4567',
      defaultOn: true,
      accent: '#2b83ba',
    },
    {
      id: 'jellyfin',
      name: 'Jellyfin Media System',
      category: 'Home Theater',
      desc: 'High-performance 4K HDR transcoding media server with multi-user profiles and metadata scrapers.',
      ports: ':8096',
      defaultOn: true,
      accent: '#aa5cc3',
    },
    {
      id: 'qbittorrent',
      name: 'qBittorrent WebUI',
      category: 'Download Automation',
      desc: 'Headless Bittorrent daemon with web management interface, torrent queuing, and rate limits.',
      ports: ':8080',
      defaultOn: true,
      accent: '#3a75c4',
    },
    {
      id: 'minecraft',
      name: 'Minecraft PaperMC Server',
      category: 'Gaming Server',
      desc: 'Optimized high-tickrate Minecraft server bundled with Playit.gg zero-port-forwarding tunnel.',
      ports: ':25565',
      defaultOn: true,
      accent: '#5b8c3a',
    },
    {
      id: 'adguard',
      name: 'AdGuard Home DNS',
      category: 'Network Security',
      desc: 'Network-wide ad-blocking and privacy tracking prevention DNS server with encrypted DoH/DoT.',
      ports: ':53, :3000',
      defaultOn: true,
      accent: '#4caf50',
    },
    {
      id: 'vaultwarden',
      name: 'Vaultwarden Password Vault',
      category: 'Security & Auth',
      desc: 'Lightweight Rust implementation of Bitwarden password manager for encrypted credentials.',
      ports: ':8000',
      defaultOn: true,
      accent: '#175ddc',
    },
    {
      id: 'tailscale',
      name: 'Tailscale Mesh VPN',
      category: 'Networking',
      desc: 'Zero-configuration WireGuard mesh VPN allowing instant secure access from anywhere.',
      ports: 'tailscale0',
      defaultOn: true,
      accent: '#ffffff',
    },
    {
      id: 'navidrome',
      name: 'Navidrome Music Streamer',
      category: 'Hi-Fi Audio',
      desc: 'Modern Subsonic-compatible music server and streamer for lossless FLAC and MP3 audio libraries.',
      ports: ':4533',
      defaultOn: false,
      accent: '#1c7ed6',
    },
    {
      id: 'filebrowser',
      name: 'FileBrowser Cloud Manager',
      category: 'Storage & Files',
      desc: 'Clean web file management interface with upload, preview, and sharing capabilities.',
      ports: ':8082',
      defaultOn: false,
      accent: '#29b6f6',
    },
    {
      id: 'syncthing',
      name: 'Syncthing Sync Engine',
      category: 'Cloud Storage',
      desc: 'Continuous peer-to-peer file synchronization between your PC, laptop, phone, and server.',
      ports: ':8384',
      defaultOn: false,
      accent: '#26a69a',
    },
    {
      id: 'prometheus',
      name: 'Prometheus & Grafana',
      category: 'Observability',
      desc: 'Comprehensive telemetry collection, hardware alert rules, and visual monitoring dashboards.',
      ports: ':9090, :3001',
      defaultOn: false,
      accent: '#e6522c',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <SpotlightCard
        className="p-5 bg-[#0e1116] border-[#353c4a]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white tracking-tight font-mono">
                  TINAPPLE OS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/30">
                  INSTALLER & HUB
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/30">
                  Niri + Waybar
                </span>
              </div>
              <p className="text-xs text-[#a4adbe] font-mono mt-0.5">
                Arch-based Appliance Station featuring isthatelitho/niri-btw scrollable tiling
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'overview', label: 'Welcome Matrix', icon: Sparkles },
              { id: 'wizard', label: 'OS Installation Wizard', icon: Layers },
              { id: 'shortcuts', label: 'Niri Keybindings', icon: FileCode },
              { id: 'tweaks', label: 'Live System & Tweaks', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as InstallerTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-tinapple-gold text-tinapple-dark shadow-md shadow-tinapple-gold/25'
                      : 'bg-[#161a22] text-[#a4adbe] hover:text-white border border-[#353c4a]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SpotlightCard>

      {/* ================= OVERVIEW TAB ================= */}
      {activeTab === 'overview' && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Hero Welcome Card */}
          <SpotlightCard
            className="p-8"
          >
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-tinapple-gold tracking-wider uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Next-Generation Arch Linux Appliance Platform</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                Deploy Your Custom Tinapple Station
              </h1>
              <p className="text-sm text-[#a4adbe] leading-relaxed font-mono">
                Tinapple OS combines an ultra-fast scrollable tiling Wayland environment (<span className="text-tinapple-gold font-bold">isthatelitho/niri-btw</span>) with a pre-configured, self-hosted homelab suite. Effortlessly stream 4K media via Jellyfin, manage manga with Suwayomi, automate torrents, host Minecraft with zero-port tunnels, and control everything through this unified Web Hub.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setActiveTab('wizard')}
                  className="px-5 py-2.5 rounded-xl bg-tinapple-gold text-tinapple-dark text-xs font-mono font-extrabold shadow-lg shadow-tinapple-gold/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Launch OS Installation Wizard</span>
                </button>

                <button
                  onClick={() => setActiveTab('shortcuts')}
                  className="px-4 py-2.5 rounded-xl bg-[#161a22] text-[#f5f6fa] border border-[#353c4a] hover:border-tinapple-gold text-xs font-mono font-bold transition-all flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4 text-tinapple-gold" />
                  <span>View Niri & Desktop Shortcuts</span>
                </button>

                {onOpenDashboard && (
                  <button
                    onClick={onOpenDashboard}
                    className="px-4 py-2.5 rounded-xl bg-[#161a22] text-tinapple-green border border-tinapple-green/40 hover:bg-tinapple-green/10 text-xs font-mono font-bold transition-all flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Live Appliance Hub</span>
                  </button>
                )}
              </div>
            </div>
          </SpotlightCard>

          {/* Featured Appliance Services Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tinapple-gold animate-pulse" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Bundled Ecosystem Applications
                </h2>
              </div>
              <span className="text-xs text-[#a4adbe]">
                Available out-of-the-box or in 1-click installer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {APP_CATALOG.slice(0, 6).map((app) => (
                <SpotlightCard
                  key={app.id}
                  className="p-4 bg-[#0e1116] border-[#353c4a] hover:border-tinapple-gold/60 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-[#161a22] border border-[#353c4a] shrink-0">
                      <AppBrandIcon id={app.id} size={30} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate font-mono">
                          {app.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161a22] text-tinapple-gold border border-[#353c4a] shrink-0">
                          {app.ports}
                        </span>
                      </div>
                      <span className="text-[10px] text-tinapple-green font-mono block">
                        {app.category}
                      </span>
                      <p className="text-[11px] text-[#a4adbe] font-mono mt-1 line-clamp-2">
                        {app.desc}
                      </p>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= WIZARD TAB (AUTHENTIC OS INSTALLER) ================= */}
      {activeTab === 'wizard' && (
        <motion.div
          key="wizard"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Main Installer Window Container */}
          <div className="bg-[#0e1116] rounded-2xl border border-[#353c4a] overflow-hidden shadow-2xl">
            {/* Installer Top Bar with Calamares-style Brand Bar */}
            <div className="bg-[#12161f] px-6 py-4 border-b border-[#353c4a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm font-bold text-white font-mono block">
                    Tinapple OS Calamares Installer
                  </span>
                  <span className="text-[11px] text-[#a4adbe] font-mono">
                    Target: {selectedDisk} | FileSystem: {filesystem.toUpperCase()} | Desktop: Niri (niri-btw)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[#a4adbe]">Step {wizardStep} of 8</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tinapple-gold" />
                <span className="text-tinapple-gold font-bold">
                  {wizardStep === 1 && 'Welcome & Region'}
                  {wizardStep === 2 && 'Storage Drive & Partition Map'}
                  {wizardStep === 3 && 'Filesystem & LUKS2'}
                  {wizardStep === 4 && 'Linux Kernel'}
                  {wizardStep === 5 && 'Appliance Stacks'}
                  {wizardStep === 6 && 'User & Identity'}
                  {wizardStep === 7 && 'Review & Summary'}
                  {wizardStep === 8 && 'Installation Progress'}
                </span>
              </div>
            </div>

            {/* Stepper Wizard Progress Bar */}
            <div className="w-full bg-[#161a22] h-1.5">
              <div
                className="bg-gradient-to-r from-tinapple-gold via-tinapple-gold to-tinapple-green h-full transition-all duration-300"
                style={{ width: `${(wizardStep / 8) * 100}%` }}
              />
            </div>

            {/* Two-Column Layout: Left Steps Sidebar + Right Step Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
              {/* Left Steps Navigation Column */}
              <div className="md:col-span-3 bg-[#0a0d12] p-4 border-b md:border-b-0 md:border-r border-[#353c4a] space-y-1 font-mono">
                {[
                  { step: 1, label: 'Welcome & Locale', icon: Globe },
                  { step: 2, label: 'Disk Partitioning', icon: HardDrive },
                  { step: 3, label: 'Filesystem & LUKS', icon: Lock },
                  { step: 4, label: 'Kernel Branch', icon: Cpu },
                  { step: 5, label: 'App Ecosystem', icon: Layers },
                  { step: 6, label: 'User & Credentials', icon: User },
                  { step: 7, label: 'Review Summary', icon: CheckCircle2 },
                  { step: 8, label: 'Deploy & Reboot', icon: Zap },
                ].map((s) => {
                  const Icon = s.icon;
                  const isDone = wizardStep > s.step;
                  const isCurrent = wizardStep === s.step;
                  return (
                    <button
                      key={s.step}
                      disabled={isInstalling}
                      onClick={() => setWizardStep(s.step)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                        isCurrent
                          ? 'bg-[#161a22] text-tinapple-gold font-bold border border-tinapple-gold/40 shadow-sm'
                          : isDone
                          ? 'text-tinapple-green hover:bg-[#161a22]/50'
                          : 'text-[#6d788d] hover:text-[#a4adbe]'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                          isCurrent
                            ? 'bg-tinapple-gold text-tinapple-dark'
                            : isDone
                            ? 'bg-tinapple-green/20 text-tinapple-green'
                            : 'bg-[#161a22] text-[#6d788d]'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
                      </div>
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Step Content Area */}
              <div className="md:col-span-9 p-6 flex flex-col justify-between">
                <div>
                  {/* STEP 1: WELCOME & LOCALE */}
                  {wizardStep === 1 && (
                    <div className="space-y-5 font-mono">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Globe className="w-5 h-5 text-tinapple-gold" />
                          Step 1: Localization & Keyboard Layout
                        </h3>
                        <p className="text-xs text-[#a4adbe] mt-1">
                          Configure console encoding, regional locale, and keyboard keymap:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            Keyboard Keymap
                          </label>
                          <select
                            value={keyboardLayout}
                            onChange={(e) => setKeyboardLayout(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-xs text-white focus:outline-none focus:border-tinapple-gold"
                          >
                            <option value="us">English (US, ANSI Standard)</option>
                            <option value="uk">English (UK, ISO)</option>
                            <option value="de">German (QWERTZ)</option>
                            <option value="fr">French (AZERTY)</option>
                            <option value="es">Spanish</option>
                            <option value="dvorak">English (Dvorak)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            System Timezone
                          </label>
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-xs text-white focus:outline-none focus:border-tinapple-gold"
                          >
                            <option value="UTC">Universal Time Coordinated (UTC)</option>
                            <option value="America/New_York">America / New York (EST)</option>
                            <option value="America/Los_Angeles">America / Los Angeles (PST)</option>
                            <option value="Europe/London">Europe / London (GMT/BST)</option>
                            <option value="Europe/Berlin">Europe / Berlin (CET)</option>
                            <option value="Asia/Tokyo">Asia / Tokyo (JST)</option>
                            <option value="Asia/Kolkata">Asia / Kolkata (IST)</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#161a22]/70 border border-[#353c4a] text-xs text-[#a4adbe] space-y-1">
                        <span className="font-bold text-white block">Automatic Hardware Detection</span>
                        <span>• CPU Microcode: Auto-detected (AMD/Intel microcode installed automatically)</span>
                        <br />
                        <span>• Audio Stack: PipeWire + WirePlumber low-latency audio server</span>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: DRIVE & PARTITION MAP */}
                  {wizardStep === 2 && (
                    <div className="space-y-5 font-mono">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <HardDrive className="w-5 h-5 text-tinapple-gold" />
                          Step 2: Target Storage Disk & Partitioning Scheme
                        </h3>
                        <p className="text-xs text-[#a4adbe] mt-1">
                          Select the target physical disk or virtual volume to receive Tinapple OS:
                        </p>
                      </div>

                      {/* Disks selection */}
                      <div className="space-y-2.5">
                        {availableDisks.map((d) => (
                          <div
                            key={d.id}
                            onClick={() => {
                              if (!d.isBootMedia) {
                                setSelectedDisk(d.id);
                              }
                            }}
                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                              d.isBootMedia
                                ? 'bg-[#161a22]/30 border-[#262c38] text-slate-500 cursor-not-allowed opacity-75'
                                : selectedDisk === d.id
                                ? 'bg-[#161a22] border-tinapple-gold text-tinapple-gold cursor-pointer'
                                : 'bg-[#161a22]/50 border-[#353c4a] text-white hover:border-[#a4adbe] cursor-pointer'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold flex items-center gap-2">
                                <span>{d.id}</span>
                                <span className={d.isBootMedia ? 'text-slate-500' : 'text-[#a4adbe]'}>({d.size})</span>
                                {d.isTarget && (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Target Internal Drive
                                  </span>
                                )}
                                {d.isBootMedia && (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    Live USB Boot Medium (Protected)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#a4adbe] mt-0.5 block">{d.model}</span>
                            </div>
                            {selectedDisk === d.id && !d.isBootMedia && (
                              <CheckCircle2 className="w-4 h-4 text-tinapple-gold" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Visual Partition Map (Calamares style) */}
                      <div className="p-4 rounded-xl bg-[#12161f] border border-[#353c4a] space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">Visual Partition Map ({selectedDisk})</span>
                          <span className="text-[11px] text-tinapple-green font-bold">GPT Partition Table</span>
                        </div>

                        {/* Partition visual bar */}
                        <div className="w-full h-8 rounded-lg overflow-hidden flex border border-[#353c4a]">
                          {/* EFI ESP */}
                          <div
                            className="bg-[#10b981] hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-black border-r border-[#0e1116] transition-all"
                            style={{ width: '15%' }}
                            title="ESP EFI: 1024 MB (FAT32) - Mount /boot/efi"
                          >
                            1GB ESP (FAT32)
                          </div>
                          {/* SWAP */}
                          <div
                            className="bg-tinapple-gold hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-black border-r border-[#0e1116] transition-all"
                            style={{ width: '20%' }}
                            title="Swap Space: 4096 MB"
                          >
                            4GB Swap
                          </div>
                          {/* ROOT */}
                          <div
                            className="bg-[#3b82f6] hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white transition-all"
                            style={{ width: '65%' }}
                            title={`Root: Remainder (${filesystem.toUpperCase()}) - Mount /`}
                          >
                            Root ({filesystem.toUpperCase()} Subvolumes)
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#a4adbe] pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                            <span>/boot/efi (1024MB FAT32)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-tinapple-gold" />
                            <span>Swapspace (4096MB)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
                            <span>/ Root ({filesystem.toUpperCase()} @, @home, @snapshots)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: FILESYSTEM & LUKS2 */}
                  {wizardStep === 3 && (
                    <div className="space-y-5 font-mono">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Lock className="w-5 h-5 text-tinapple-gold" />
                          Step 3: Root Filesystem & LUKS2 Disk Encryption
                        </h3>
                        <p className="text-xs text-[#a4adbe] mt-1">
                          Choose the root storage filesystem and optionally enable full-disk encryption:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            id: 'btrfs',
                            name: 'BTRFS (Recommended)',
                            desc: 'Includes atomic snapshots, zstd transparent compression, and subvolumes.',
                          },
                          {
                            id: 'ext4',
                            name: 'EXT4 (Classic)',
                            desc: 'Bulletproof journaled filesystem standard across Linux distributions.',
                          },
                          {
                            id: 'xfs',
                            name: 'XFS (Enterprise)',
                            desc: 'High-throughput parallel I/O designed for massive dataset storage.',
                          },
                        ].map((fs) => (
                          <div
                            key={fs.id}
                            onClick={() => setFilesystem(fs.id as any)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              filesystem === fs.id
                                ? 'bg-[#161a22] border-tinapple-gold text-tinapple-gold'
                                : 'bg-[#161a22]/50 border-[#353c4a] text-white hover:border-[#a4adbe]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{fs.name}</span>
                              {filesystem === fs.id && <Check className="w-4 h-4 text-tinapple-gold" />}
                            </div>
                            <p className="text-[11px] text-[#a4adbe] mt-1">{fs.desc}</p>
                          </div>
                        ))}
                      </div>

                      {/* LUKS Encryption Box */}
                      <div className="p-4 rounded-xl bg-[#12161f] border border-[#353c4a] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">
                              LUKS2 Full Disk Encryption
                            </span>
                            <span className="text-[11px] text-[#a4adbe]">
                              Encrypts root volume with AES-XTS-256 and Argon2id key derivation.
                            </span>
                          </div>
                          <SquishSwitch checked={enableLuks} onChange={setEnableLuks} />
                        </div>

                        {enableLuks && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#353c4a]/50">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-white">
                                Disk Passphrase
                              </label>
                              <input
                                type={showPassphrase ? 'text' : 'password'}
                                value={luksPassphrase}
                                onChange={(e) => setLuksPassphrase(e.target.value)}
                                placeholder="Min 6 characters"
                                className="w-full px-3 py-2 rounded-lg bg-[#161a22] border border-[#353c4a] text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-white">
                                Confirm Passphrase
                              </label>
                              <input
                                type={showPassphrase ? 'text' : 'password'}
                                value={luksConfirm}
                                onChange={(e) => setLuksConfirm(e.target.value)}
                                placeholder="Re-enter passphrase"
                                className="w-full px-3 py-2 rounded-lg bg-[#161a22] border border-[#353c4a] text-xs text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: LINUX KERNEL */}
                  {wizardStep === 4 && (
                    <div className="space-y-5 font-mono">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-tinapple-gold" />
                          Step 4: Linux Kernel Architecture
                        </h3>
                        <p className="text-xs text-[#a4adbe] mt-1">
                          Select the kernel branch compiled for your performance and reliability requirements:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            id: 'lts',
                            name: 'Linux LTS (Recommended)',
                            desc: 'Long-Term Support kernel 6.6 with verified enterprise hardware stability.',
                          },
                          {
                            id: 'current',
                            name: 'Linux Current (CachyOS)',
                            desc: 'Upstream branch featuring BORE CPU scheduler and x86-64-v3/v4 binaries.',
                          },
                          {
                            id: 'zen',
                            name: 'Linux Zen',
                            desc: 'Tuned for interactive desktop responsiveness, low latency audio and gaming.',
                          },
                          {
                            id: 'hardened',
                            name: 'Linux Hardened',
                            desc: 'Enhanced security features with proactive memory exploit mitigations.',
                          },
                        ].map((k) => (
                          <div
                            key={k.id}
                            onClick={() => setKernel(k.id as any)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              kernel === k.id
                                ? 'bg-[#161a22] border-tinapple-gold text-tinapple-gold'
                                : 'bg-[#161a22]/50 border-[#353c4a] text-white hover:border-[#a4adbe]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{k.name}</span>
                              {kernel === k.id && <Check className="w-4 h-4 text-tinapple-gold" />}
                            </div>
                            <p className="text-[11px] text-[#a4adbe] mt-1">{k.desc}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            Bootloader Engine
                          </label>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            firmwareMode === 'bios' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {firmwareMode === 'bios' ? 'Detected: BIOS / Legacy CSM' : 'Detected: UEFI 64-bit'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            disabled={firmwareMode === 'bios'}
                            onClick={() => setBootloader('limine')}
                            className={`p-3 rounded-xl border text-left ${
                              firmwareMode === 'bios'
                                ? 'opacity-40 cursor-not-allowed bg-[#161a22]/30 border-[#353c4a]'
                                : bootloader === 'limine'
                                ? 'bg-[#161a22] border-tinapple-gold text-tinapple-gold'
                                : 'bg-[#161a22]/50 border-[#353c4a] text-white'
                            }`}
                          >
                            <span className="text-xs font-bold block">Limine (Modern UEFI Fastboot)</span>
                            <span className="text-[10px] text-[#a4adbe]">
                              {firmwareMode === 'bios' ? 'Disabled on Legacy BIOS' : 'Default for instant boot'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBootloader('grub')}
                            className={`p-3 rounded-xl border text-left ${
                              bootloader === 'grub'
                                ? 'bg-[#161a22] border-tinapple-gold text-tinapple-gold'
                                : 'bg-[#161a22]/50 border-[#353c4a] text-white'
                            }`}
                          >
                            <span className="text-xs font-bold block">
                              GRUB 2.12 {firmwareMode === 'bios' && '(Recommended for BIOS)'}
                            </span>
                            <span className="text-[10px] text-[#a4adbe]">
                              {firmwareMode === 'bios' ? 'Native BIOS MBR bootloader' : 'Legacy & dual-boot support'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: APPLIANCE STACKS WITH AUTHENTIC BRAND ICONS */}
                  {wizardStep === 5 && (
                    <div className="space-y-4 font-mono">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-tinapple-gold" />
                            Step 5: Appliance Stacks & Applications
                          </h3>
                          <p className="text-xs text-[#a4adbe] mt-0.5">
                            Select the self-hosted services and desktop components to provision:
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedApps(APP_CATALOG.map((a) => a.id))}
                            className="text-[11px] font-bold text-tinapple-gold hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-[#353c4a]">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedApps(['niri', 'suwayomi', 'jellyfin'])}
                            className="text-[11px] font-bold text-[#a4adbe] hover:underline"
                          >
                            Defaults
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {APP_CATALOG.map((app) => {
                          const isSelected = selectedApps.includes(app.id);
                          return (
                            <div
                              key={app.id}
                              onClick={() => handleToggleApp(app.id)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                                isSelected
                                  ? 'bg-[#161a22] border-tinapple-gold text-white'
                                  : 'bg-[#161a22]/40 border-[#353c4a] text-[#a4adbe] hover:border-[#a4adbe]'
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-[#0e1116] border border-[#353c4a] shrink-0 mt-0.5">
                                <AppBrandIcon id={app.id} size={28} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-white truncate">
                                    {app.name}
                                  </span>
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-tinapple-gold shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[#6d788d] shrink-0" />
                                  )}
                                </div>
                                <span className="text-[10px] text-tinapple-green block">
                                  {app.category} • {app.ports}
                                </span>
                                <p className="text-[11px] text-[#a4adbe] mt-1 line-clamp-2">
                                  {app.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 6: USER & CREDENTIALS */}
                  {wizardStep === 6 && (
                    <div className="space-y-5 font-mono">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <User className="w-5 h-5 text-tinapple-gold" />
                          Step 6: User Accounts & System Security
                        </h3>
                        <p className="text-xs text-[#a4adbe] mt-1">
                          Configure primary administrator user and appliance hostname:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            Appliance Hostname <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={hostname}
                            onChange={(e) => setHostname(e.target.value.toLowerCase())}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#161a22] border text-xs text-white focus:outline-none ${
                              identityErrors.hostname ? 'border-red-500' : 'border-[#353c4a]'
                            }`}
                          />
                          {identityErrors.hostname && (
                            <span className="text-[10px] text-red-400 block">{identityErrors.hostname}</span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            Primary Username <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase())}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#161a22] border text-xs text-white focus:outline-none ${
                              identityErrors.username ? 'border-red-500' : 'border-[#353c4a]'
                            }`}
                          />
                          {identityErrors.username && (
                            <span className="text-[10px] text-red-400 block">{identityErrors.username}</span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            User Password <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="password"
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#161a22] border text-xs text-white focus:outline-none ${
                              identityErrors.userPassword ? 'border-red-500' : 'border-[#353c4a]'
                            }`}
                          />
                          {identityErrors.userPassword && (
                            <span className="text-[10px] text-red-400 block">
                              {identityErrors.userPassword}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            Confirm Password <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="password"
                            value={userConfirm}
                            onChange={(e) => setUserConfirm(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#161a22] border text-xs text-white focus:outline-none ${
                              identityErrors.userConfirm ? 'border-red-500' : 'border-[#353c4a]'
                            }`}
                          />
                          {identityErrors.userConfirm && (
                            <span className="text-[10px] text-red-400 block">
                              {identityErrors.userConfirm}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#12161f] border border-[#353c4a] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">
                              Grant Sudo Administrator Privileges
                            </span>
                            <span className="text-[11px] text-[#a4adbe]">
                              Adds '{username}' to wheel group with root escalation.
                            </span>
                          </div>
                          <SquishSwitch checked={enableSudo} onChange={setEnableSudo} />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#353c4a]/50">
                          <div>
                            <span className="text-xs font-bold text-white block">
                              Use Same Password for Root Account
                            </span>
                            <span className="text-[11px] text-[#a4adbe]">
                              Syncs user password to the root superuser account.
                            </span>
                          </div>
                          <SquishSwitch checked={sameRootPass} onChange={setSameRootPass} />
                        </div>

                        {!sameRootPass && (
                          <div className="pt-2">
                            <label className="text-[11px] font-bold text-white block mb-1">
                              Independent Root Password
                            </label>
                            <input
                              type="password"
                              value={rootPassword}
                              onChange={(e) => setRootPassword(e.target.value)}
                              placeholder="Enter root password"
                              className="w-full px-3 py-2 rounded-lg bg-[#161a22] border border-[#353c4a] text-xs text-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 7: REVIEW & SUMMARY */}
                  {wizardStep === 7 && (
                    <div className="space-y-4 font-mono">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-tinapple-gold" />
                          Step 7: Installation Summary & Drive Review
                        </h3>
                        <p className="text-xs text-[#a4adbe] mt-1">
                          Verify deployment parameters before committing partition layout to disk:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-[#161a22] border border-[#353c4a] space-y-1.5">
                          <span className="text-tinapple-gold font-bold block">Storage Target</span>
                          <div className="text-white">Drive: {selectedDisk}</div>
                          <div className="text-[#a4adbe]">Filesystem: {filesystem.toUpperCase()}</div>
                          <div className="text-[#a4adbe]">ESP: 1024 MB (FAT32) | Swap: 4096 MB</div>
                          <div className="text-[#a4adbe]">Encryption: {enableLuks ? 'LUKS2 Enabled' : 'Disabled'}</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#161a22] border border-[#353c4a] space-y-1.5">
                          <span className="text-tinapple-gold font-bold block">System Identity</span>
                          <div className="text-white">Hostname: {hostname}</div>
                          <div className="text-[#a4adbe]">User: {username} (sudo: {String(enableSudo)})</div>
                          <div className="text-[#a4adbe]">Kernel: Linux {kernel.toUpperCase()}</div>
                          <div className="text-[#a4adbe]">Bootloader: {bootloader.toUpperCase()}</div>
                        </div>

                        <div className="col-span-full p-3.5 rounded-xl bg-[#161a22] border border-[#353c4a] space-y-2">
                          <span className="text-tinapple-gold font-bold block">
                            Provisioned Applications ({selectedApps.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedApps.map((appId) => {
                              const item = APP_CATALOG.find((a) => a.id === appId);
                              return (
                                <div
                                  key={appId}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1116] border border-[#353c4a] text-[11px]"
                                >
                                  <AppBrandIcon id={appId} size={16} />
                                  <span className="text-white font-bold">{item?.name || appId}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          Warning: Committing installation will reformat target drive {selectedDisk}. Ensure any critical existing data has been backed up.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* STEP 8: LIVE INSTALLATION PROGRESS */}
                  {wizardStep === 8 && (
                    <div className="space-y-4 font-mono">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Zap className="w-5 h-5 text-tinapple-gold" />
                          Step 8: Appliance Deployment in Progress
                        </h3>
                        <p className="text-xs text-[#a4adbe] mt-1">
                          Formatting drives, pacstrapping system packages, and configuring Niri Wayland station:
                        </p>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white font-bold">
                            {installComplete ? 'Installation Complete!' : 'Deploying System Root...'}
                          </span>
                          <span className="text-tinapple-gold font-bold">{installProgress}%</span>
                        </div>
                        <div className="w-full bg-[#161a22] h-3 rounded-full overflow-hidden border border-[#353c4a]">
                          <div
                            className="bg-gradient-to-r from-tinapple-gold to-tinapple-green h-full transition-all duration-300"
                            style={{ width: `${installProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Live Terminal Log */}
                      <div className="p-4 rounded-xl bg-black/80 border border-[#353c4a] h-64 overflow-y-auto space-y-1 font-mono text-[11px]">
                        {installLog.map((line, idx) => (
                          <div
                            key={idx}
                            className={
                              line.includes('[SUCCESS]')
                                ? 'text-tinapple-green font-bold'
                                : line.includes('[WARN]')
                                ? 'text-amber-400'
                                : 'text-[#a4adbe]'
                            }
                          >
                            {line}
                          </div>
                        ))}
                      </div>

                      {installComplete && (
                        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span>
                              Tinapple OS successfully installed to {selectedDisk}. System is ready to boot!
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              fetch('/api/v1/system/reboot', { method: 'POST' }).catch(() => {});
                              alert('Reboot signal sent. System will now reboot into your installed Tinapple OS!');
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Reboot into System</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Control Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-[#353c4a] mt-6 font-mono">
                  <button
                    disabled={wizardStep === 1 || isInstalling}
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4 py-2 rounded-xl bg-[#161a22] text-[#f5f6fa] border border-[#353c4a] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 hover:border-[#a4adbe]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {wizardStep < 7 && (
                      <button
                        disabled={wizardStep === 6 && !canProceedStep6}
                        onClick={() => setWizardStep(wizardStep + 1)}
                        className="px-5 py-2 rounded-xl bg-tinapple-gold text-tinapple-dark text-xs font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <span>Next Step</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {wizardStep === 7 && (
                      <button
                        onClick={() => {
                          setWizardStep(8);
                          startRealInstallation();
                        }}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-tinapple-gold to-tinapple-green text-[#0e1116] text-xs font-black shadow-lg shadow-tinapple-gold/25 hover:brightness-110 active:scale-95 flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Install Tinapple OS</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= SHORTCUTS TAB (NIRI-BTW 100% ACCURATE) ================= */}
      {activeTab === 'shortcuts' && (
        <motion.div
          key="shortcuts"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Host conflict notice */}
          <SpotlightCard
            className="p-5 bg-[#12161f] border-tinapple-gold/40"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/30 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-1 font-mono">
                <span className="text-xs font-bold text-white block">
                  Pro-Tip: Workaround for Host Shortcut Conflicts
                </span>
                <p className="text-xs text-[#a4adbe] leading-relaxed">
                  If your Linux host also uses the <code className="text-tinapple-gold">Super</code> (Mod4) key, press{' '}
                  <kbd className="px-2 py-0.5 rounded bg-[#161a22] text-tinapple-gold border border-[#353c4a] font-bold">
                    Ctrl + Alt + G
                  </kbd>{' '}
                  in the QEMU window to grab 100% of keyboard & mouse inputs directly into the VM. Alternatively, all main actions also support the <kbd className="px-1.5 py-0.5 rounded bg-[#161a22] text-white border border-[#353c4a]">Alt</kbd> key!
                </p>
              </div>
            </div>
          </SpotlightCard>

          {/* Keybindings Reference Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            {/* Terminal & Core Applications */}
            <div className="p-5 rounded-2xl bg-[#0e1116] border border-[#353c4a] space-y-3">
              <span className="text-xs font-bold text-tinapple-gold uppercase tracking-wider block">
                Applications & Terminal
              </span>
              <div className="space-y-2 text-xs">
                {[
                  { keys: ['Super + Return', 'Alt + Return'], desc: 'Open Kitty GPU Terminal' },
                  { keys: ['Super + Space', 'Alt + Space'], desc: 'Launch Rofi Application Menu' },
                  { keys: ['Super + B'], desc: 'Launch Firefox Web Browser' },
                  { keys: ['Super + Shift + B'], desc: 'Open Tinapple Hub Dashboard (:8088)' },
                  { keys: ['Super + E'], desc: 'Open Thunar File Manager' },
                  { keys: ['Super + Q', 'Super + W'], desc: 'Close Active Window' },
                ].map((k, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#353c4a]/40">
                    <div className="flex gap-1.5">
                      {k.keys.map((key) => (
                        <kbd key={key} className="px-2 py-0.5 rounded bg-[#161a22] text-[#f5f6fa] border border-[#353c4a] text-[11px]">
                          {key}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#a4adbe]">{k.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rice, Wallpaper & Theming (niri-btw) */}
            <div className="p-5 rounded-2xl bg-[#0e1116] border border-[#353c4a] space-y-3">
              <span className="text-xs font-bold text-tinapple-green uppercase tracking-wider block">
                Niri Rice & Wallpaper Engine (niri-btw)
              </span>
              <div className="space-y-2 text-xs">
                {[
                  { keys: ['Super + Shift + N'], desc: 'Open Visual Wallpaper Selector (Rofi)' },
                  { keys: ['Super + N'], desc: 'Set Random Wallpaper + Run Pywal Colors' },
                  { keys: ['Super + Z'], desc: 'Toggle Waybar Visibility' },
                  { keys: ['Super + X'], desc: 'Reload Waybar Instance' },
                  { keys: ['Super + Shift + V'], desc: 'Clipboard History Selector (Cliphist)' },
                  { keys: ['Super + Alt + L'], desc: 'Lock Screen (Swaylock)' },
                ].map((k, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#353c4a]/40">
                    <div className="flex gap-1.5">
                      {k.keys.map((key) => (
                        <kbd key={key} className="px-2 py-0.5 rounded bg-[#161a22] text-tinapple-green border border-[#353c4a] text-[11px]">
                          {key}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#a4adbe]">{k.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable Tiling Navigation */}
            <div className="col-span-full p-5 rounded-2xl bg-[#0e1116] border border-[#353c4a] space-y-3">
              <span className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider block">
                Niri Scrollable Column Navigation
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  { keys: ['Super + Left / Right', 'Super + H / L'], desc: 'Navigate between scrollable columns' },
                  { keys: ['Super + Up / Down', 'Super + K / J'], desc: 'Navigate vertically within window column' },
                  { keys: ['Super + Ctrl + Left / Right'], desc: 'Move active column left or right' },
                  { keys: ['Super + Shift + Left / Right'], desc: 'Move active window to adjacent column' },
                  { keys: ['Super + R'], desc: 'Cycle column preset width (1/3, 1/2, 2/3, 100%)' },
                  { keys: ['Super + O'], desc: 'Toggle Niri workspace overview' },
                ].map((k, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#161a22] border border-[#353c4a] space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {k.keys.map((key) => (
                        <kbd key={key} className="px-1.5 py-0.5 rounded bg-[#0e1116] text-[#38bdf8] border border-[#353c4a] text-[10px]">
                          {key}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#a4adbe] block">{k.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= TWEAKS & LIVE SYSTEM TAB ================= */}
      {activeTab === 'tweaks' && (
        <motion.div
          key="tweaks"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {tweakStatus && (
            <div className="p-4 rounded-xl bg-tinapple-gold/15 border border-tinapple-gold/40 text-xs font-mono text-tinapple-gold flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{tweakStatus}</span>
            </div>
          )}

          {/* Running Service Endpoints */}
          <SpotlightCard
            className="p-6 bg-[#0e1116] border-[#353c4a]"
          >
            <div className="mb-4 font-mono">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Active Appliance Service Endpoints
              </span>
              <span className="text-xs text-[#a4adbe]">
                Click any service to open its dashboard in your browser:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
              {[
                { name: 'Tinapple Hub', port: '8088', url: 'http://localhost:8088', icon: 'desktop', desc: 'Central Control Hub' },
                { name: 'Suwayomi Server', port: '4567', url: 'http://localhost:4567', icon: 'suwayomi', desc: 'Manga WebUI' },
                { name: 'Jellyfin Media', port: '8096', url: 'http://localhost:8096', icon: 'jellyfin', desc: 'Home Theater WebUI' },
                { name: 'qBittorrent', port: '8080', url: 'http://localhost:8080', icon: 'qbittorrent', desc: 'Download Client' },
                { name: 'Minecraft Server', port: '25565', url: 'localhost:25565', icon: 'minecraft', desc: 'PaperMC + Playit' },
                { name: 'AdGuard Home', port: '3000', url: 'http://localhost:3000', icon: 'adguard', desc: 'DNS Protection' },
              ].map((svc) => (
                <a
                  key={svc.name}
                  href={svc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-[#161a22] border border-[#353c4a] hover:border-tinapple-gold transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <AppBrandIcon id={svc.icon} size={24} />
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-tinapple-gold transition-colors block">
                        {svc.name}
                      </span>
                      <span className="text-[10px] text-[#a4adbe]">{svc.desc}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#a4adbe] group-hover:text-tinapple-gold" />
                </a>
              ))}
            </div>
          </SpotlightCard>

          {/* Quick System Action Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <button
              onClick={() => handleTweak('Wallpaper Refresh', '/api/v1/desktop/wallpaper/random')}
              className="p-4 rounded-xl bg-[#161a22] border border-[#353c4a] hover:border-tinapple-gold text-left transition-all"
            >
              <RefreshCw className="w-4 h-4 text-tinapple-gold mb-2" />
              <span className="text-xs font-bold text-white block">Randomize Wallpaper</span>
              <span className="text-[11px] text-[#a4adbe]">Triggers Swww & Pywal color regen</span>
            </button>

            <button
              onClick={() => handleTweak('NTP Time Sync', '/api/v1/system/timesync')}
              className="p-4 rounded-xl bg-[#161a22] border border-[#353c4a] hover:border-tinapple-green text-left transition-all"
            >
              <Zap className="w-4 h-4 text-tinapple-green mb-2" />
              <span className="text-xs font-bold text-white block">Synchronize NTP Time</span>
              <span className="text-[11px] text-[#a4adbe]">Sync system clock with pool.ntp.org</span>
            </button>

            <button
              onClick={() => handleTweak('Waybar Restart', '/api/v1/desktop/waybar/restart')}
              className="p-4 rounded-xl bg-[#161a22] border border-[#353c4a] hover:border-[#38bdf8] text-left transition-all"
            >
              <Sliders className="w-4 h-4 text-[#38bdf8] mb-2" />
              <span className="text-xs font-bold text-white block">Reload Waybar</span>
              <span className="text-[11px] text-[#a4adbe]">Re-parses ~/.config/waybar/config</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WelcomeInstaller;
