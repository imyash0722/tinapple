import React, { useState, useEffect } from 'react';
import {
  Monitor,
  HardDrive,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { SpotlightCard } from '../reactbits/SpotlightCard';
import { ShinyText } from '../reactbits/ShinyText';
import { DecryptedText } from '../reactbits/DecryptedText';
import { SquishSwitch } from '../reactbits/SquishSwitch';
import { CountUp } from '../reactbits/CountUp';
import { StarBorder } from '../reactbits/StarBorder';
import { BrandLogo } from '../common/BrandLogo';

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

  // Installation Wizard State (9 stages)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [keyboardLayout, setKeyboardLayout] = useState<string>('us');
  const [selectedDisk, setSelectedDisk] = useState<string>('/dev/vda');
  const [diskStrategy, setDiskStrategy] = useState<'auto' | 'custom'>('auto');
  const [filesystem, setFilesystem] = useState<'btrfs' | 'ext4' | 'xfs'>('btrfs');
  const [enableLuks, setEnableLuks] = useState<boolean>(false);
  const [luksPassphrase, setLuksPassphrase] = useState<string>('');
  const [luksConfirm, setLuksConfirm] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [bootloader, setBootloader] = useState<'limine' | 'grub'>('limine');

  const [hostname, setHostname] = useState<string>('tinapple-appliance');
  const [username, setUsername] = useState<string>('pineapple');
  const [userPassword, setUserPassword] = useState<string>('tinapple');
  const [userConfirm, setUserConfirm] = useState<string>('tinapple');
  const [enableSudo, setEnableSudo] = useState<boolean>(true);
  const [sameRootPass, setSameRootPass] = useState<boolean>(true);
  const [rootPassword, setRootPassword] = useState<string>('');

  const [kernel, setKernel] = useState<'lts' | 'current' | 'hardened' | 'zen'>('lts');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([
    'base',
    'desktop',
    'media',
    'downloads',
  ]);
  const [enableProprietary, setEnableProprietary] = useState<boolean>(false);

  // Installation execution status
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [installComplete, setInstallComplete] = useState<boolean>(false);

  // Tweak action status toast
  const [tweakStatus, setTweakStatus] = useState<string | null>(null);

  // Check if system is already installed
  useEffect(() => {
    fetch('/api/system/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.installed) {
          setIsLiveIso(false);
        }
      })
      .catch(() => {
        // Fallback: in live ISO mock mode, default to true
        setIsLiveIso(true);
      });
  }, []);

  const handleToggleAutostart = (val: boolean) => {
    setAutostartOnBoot(val);
    localStorage.setItem('tinapple_autostart_on_boot', String(val));
    // Also dispatch to backend if available
    fetch('/api/system/autostart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: val }),
    }).catch(() => {});
  };

  const handleToggleProfile = (id: string) => {
    if (selectedProfiles.includes(id)) {
      setSelectedProfiles(selectedProfiles.filter((p) => p !== id));
    } else {
      setSelectedProfiles([...selectedProfiles, id]);
    }
  };

  const runInstallSimulation = () => {
    setIsInstalling(true);
    setInstallProgress(5);
    setInstallLog([
      `[INFO] Starting Tinapple OS Deployment Engine v0.1.0...`,
      `[INFO] Target Drive: ${selectedDisk} | Strategy: ${diskStrategy.toUpperCase()}`,
      `[INFO] Partitioning ${selectedDisk} (1024M EFI ESP + 4096M Swap + Remainder Root)...`,
    ]);

    const steps = [
      { p: 18, msg: `[INFO] Formatting EFI partition as FAT32, Swap as swapspace...` },
      { p: 32, msg: `[INFO] Formatting Root as ${filesystem.toUpperCase()} (Creating @, @home, @snapshots, @var_log)...` },
      { p: 48, msg: `[INFO] Pacstrapping Linux ${kernel.toUpperCase()} and minimal appliance base...` },
      { p: 64, msg: `[INFO] Installing Niri Wayland compositor, Waybar V3.1a theme, foot, fuzzel...` },
      { p: 78, msg: `[INFO] Applying Matugen dynamic color palette templates & systemd services...` },
      { p: 88, msg: `[INFO] Deploying ${bootloader.toUpperCase()} modern bootloader to ESP...` },
      { p: 95, msg: `[INFO] Setting up user '${username}' (sudo: ${enableSudo}) and hostname '${hostname}'...` },
      { p: 100, msg: `[SUCCESS] Tinapple OS appliance deployed successfully! Ready to boot.` },
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        const item = steps[current];
        setInstallProgress(item.p);
        setInstallLog((prev) => [...prev, item.msg]);
        current++;
      } else {
        clearInterval(interval);
        setIsInstalling(false);
        setInstallComplete(true);
      }
    }, 700);
  };

  const runTweakAction = (title: string, cmd: string) => {
    setTweakStatus(`Executing: ${title}...`);
    setTimeout(() => {
      setTweakStatus(`✓ Successfully completed: ${title}`);
      setTimeout(() => setTweakStatus(null), 3000);
    }, 1200);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 pb-36 space-y-6">
      {/* 1. CACHYOS-STYLE HEADER CARD WITH BRANDING & AUTOSTART TOGGLE */}
      <SpotlightCard
        spotlightColor="rgba(229, 181, 103, 0.15)"
        borderColor="rgba(229, 181, 103, 0.4)"
        className="p-6 bg-[#0e1116] border-[#353c4a]"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Logo & Headline */}
          <div className="flex items-center gap-4">
            <BrandLogo size={48} electric={true} />
            <div>
              <div className="flex items-center gap-3">
                <ShinyText
                  text="TINAPPLE APPLIANCE OS"
                  shimmerColor="#e5b567"
                  className="text-xl md:text-2xl font-black font-mono tracking-tight text-white"
                />
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#161a22] border border-[#353c4a] text-[#e5b567]">
                  v0.1.0
                </span>
                {isLiveIso ? (
                  <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Live ISO Session
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-[#7ec789]/10 border border-[#7ec789]/30 text-[#7ec789]">
                    <span className="w-2 h-2 rounded-full bg-[#7ec789]" />
                    Appliance Installed
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-[#a4adbe] mt-1 flex items-center gap-2">
                <DecryptedText
                  text="CachyOS-Style Welcome & Live Appliance Installer Deck"
                  speed={25}
                  maxIterations={10}
                  className="text-[#7ec789] font-semibold"
                  encryptedClassName="text-[#e5b567]/70"
                />
                <span className="text-[#353c4a]">|</span>
                <span>Niri + Waybar V3.1a</span>
              </div>
            </div>
          </div>

          {/* Autostart on Boot Toggle (Crucial CachyOS Hello Feature) */}
          <div className="flex items-center gap-4 bg-[#161a22] px-4 py-2.5 rounded-xl border border-[#353c4a]">
            <div className="text-right font-mono">
              <div className="text-xs font-bold text-[#f5f6fa]">Autostart on boot</div>
              <div className="text-[10px] text-[#a4adbe]">
                {autostartOnBoot ? 'Opens automatically at login' : 'Autostart disabled'}
              </div>
            </div>
            <SquishSwitch
              checked={autostartOnBoot}
              onChange={handleToggleAutostart}
              className="bg-[#222733]"
            />
          </div>
        </div>

        {/* CachyOS-style Top Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-[#353c4a]/60">
          {[
            { id: 'overview', label: '󰣇 Welcome & Hardware Audit', icon: Monitor },
            { id: 'wizard', label: '󰒋 Installation Wizard', icon: Layers },
            { id: 'tweaks', label: ' System Tweaks', icon: Gauge },
            { id: 'shortcuts', label: '󰌨 Niri & Waybar Keybindings', icon: FileCode },
          ].map((tab) => {
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as InstallerTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-[#e5b567] text-[#060709] shadow-md shadow-[#e5b567]/20 scale-[1.02]'
                    : 'bg-[#161a22] text-[#a4adbe] hover:text-[#f5f6fa] hover:bg-[#222733] border border-[#353c4a]'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </SpotlightCard>

      {/* 2. TAB CONTENT PANELS */}
      <AnimatePresence mode="wait">
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Hero Quick Action Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SpotlightCard
                spotlightColor="rgba(229, 181, 103, 0.25)"
                borderColor="rgba(229, 181, 103, 0.6)"
                className="lg:col-span-2 p-6 bg-gradient-to-br from-[#161a22] to-[#0e1116] border-[#e5b567]/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#e5b567] text-xs font-mono font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-4 h-4 text-[#e5b567]" />
                    Interactive Deployment Wizard
                  </div>
                  <h2 className="text-2xl font-bold font-mono text-[#f5f6fa] mb-2">
                    Install Tinapple Appliance OS to Disk
                  </h2>
                  <p className="text-sm font-sans text-[#a4adbe] leading-relaxed max-w-2xl">
                    Deploy an ultra-lightweight, high-performance appliance workstation with Niri
                    scrollable tiling, Waybar V3.1a theme, Matugen dynamic colors, and pre-tuned
                    microcode & storage optimization.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <StarBorder
                    color="#e5b567"
                    speed="3s"
                    onClick={() => setActiveTab('wizard')}
                    className="font-mono text-sm font-bold text-[#060709]"
                  >
                    <span className="flex items-center gap-2 text-[#e5b567] group-hover:text-white font-bold">
                      <Play className="w-4 h-4 fill-current" />
                      Launch Guided Installer
                    </span>
                  </StarBorder>

                  <button
                    onClick={() => {
                      if (onOpenDashboard) onOpenDashboard();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-[#161a22] text-[#f5f6fa] hover:bg-[#222733] border border-[#353c4a] transition-all"
                  >
                    <Gauge className="w-4 h-4 text-[#7ec789]" />
                    Explore System Hub
                  </button>
                </div>
              </SpotlightCard>

              {/* Hardware Quick Facts */}
              <SpotlightCard
                spotlightColor="rgba(126, 199, 137, 0.15)"
                borderColor="rgba(126, 199, 137, 0.4)"
                className="p-6 bg-[#0e1116] border-[#353c4a] flex flex-col justify-between font-mono"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-[#7ec789] uppercase tracking-wider">
                      Chassis Audit
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#7ec789]" />
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Firmware:</span>
                      <span className="text-[#f5f6fa] font-bold">UEFI (x86_64)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Compositor:</span>
                      <span className="text-[#e5b567] font-bold">Niri Wayland</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Theme Bar:</span>
                      <span className="text-[#f5f6fa] font-bold">Waybar V3.1a</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#a4adbe]">Colors:</span>
                      <span className="text-[#7ec789] font-bold">Matugen Material You</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#353c4a]/60 flex items-center justify-between text-[11px] text-[#a4adbe]">
                  <span>Status: Ready</span>
                  <span className="w-2 h-2 rounded-full bg-[#7ec789]" />
                </div>
              </SpotlightCard>
            </div>

            {/* Hardware Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SpotlightCard
                spotlightColor="rgba(229, 181, 103, 0.12)"
                borderColor="rgba(229, 181, 103, 0.3)"
                className="p-4 bg-[#0e1116] border-[#353c4a]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#e5b567]/10 text-[#e5b567] border border-[#e5b567]/30">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-[#a4adbe]">Processor Cores</div>
                    <div className="text-xl font-bold font-mono text-[#f5f6fa] flex items-center gap-1">
                      <CountUp to={8} duration={1.2} />
                      <span className="text-xs text-[#a4adbe] font-normal">vCPUs</span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(126, 199, 137, 0.12)"
                borderColor="rgba(126, 199, 137, 0.3)"
                className="p-4 bg-[#0e1116] border-[#353c4a]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#7ec789]/10 text-[#7ec789] border border-[#7ec789]/30">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-[#a4adbe]">System RAM</div>
                    <div className="text-xl font-bold font-mono text-[#f5f6fa] flex items-center gap-1">
                      <CountUp to={16} duration={1.2} />
                      <span className="text-xs text-[#a4adbe] font-normal">GB DDR5</span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(122, 162, 247, 0.12)"
                borderColor="rgba(122, 162, 247, 0.3)"
                className="p-4 bg-[#0e1116] border-[#353c4a]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-[#a4adbe]">Primary Disk</div>
                    <div className="text-base font-bold font-mono text-[#f5f6fa]">
                      /dev/vda <span className="text-xs text-[#a4adbe]">(40 GB)</span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(229, 181, 103, 0.12)"
                borderColor="rgba(229, 181, 103, 0.3)"
                className="p-4 bg-[#0e1116] border-[#353c4a]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#e5b567]/10 text-[#e5b567] border border-[#e5b567]/30">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-[#a4adbe]">Network Gateway</div>
                    <div className="text-base font-bold font-mono text-[#7ec789]">
                      Connected (DHCP)
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </motion.div>
        )}

        {/* ================= WIZARD TAB ================= */}
        {activeTab === 'wizard' && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Step Stepper Progress Bar */}
            <div className="bg-[#0e1116] p-4 rounded-2xl border border-[#353c4a]">
              <div className="flex items-center justify-between mb-3 text-xs font-mono font-bold">
                <span className="text-[#e5b567]">Stage {wizardStep} of 9</span>
                <span className="text-[#a4adbe]">
                  {wizardStep === 1 && 'Keyboard Layout'}
                  {wizardStep === 2 && 'Storage Drive & Partitioning'}
                  {wizardStep === 3 && 'Filesystem Selection'}
                  {wizardStep === 4 && 'LUKS2 Encryption'}
                  {wizardStep === 5 && 'Bootloader'}
                  {wizardStep === 6 && 'System Identity & User'}
                  {wizardStep === 7 && 'Kernel Optimization'}
                  {wizardStep === 8 && 'Appliance Profiles'}
                  {wizardStep === 9 && 'Review & Deploy'}
                </span>
              </div>
              <div className="w-full bg-[#161a22] h-2 rounded-full overflow-hidden border border-[#353c4a]/50">
                <div
                  className="bg-gradient-to-r from-[#e5b567] to-[#7ec789] h-full transition-all duration-300"
                  style={{ width: `${(wizardStep / 9) * 100}%` }}
                />
              </div>
            </div>

            {/* WIZARD CONTENT BY STEP */}
            <SpotlightCard
              spotlightColor="rgba(229, 181, 103, 0.1)"
              borderColor="rgba(229, 181, 103, 0.3)"
              className="p-6 bg-[#0e1116] border-[#353c4a]"
            >
              {/* STEP 1: KEYBOARD */}
              {wizardStep === 1 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#e5b567]" />
                    Step 1: Keyboard & Regional Layout
                  </h3>
                  <p className="text-xs text-[#a4adbe]">
                    Select the keyboard keymap for the appliance console and graphical session:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { id: 'us', label: 'US English (Standard)' },
                      { id: 'uk', label: 'UK English' },
                      { id: 'de', label: 'German (QWERTZ)' },
                      { id: 'fr', label: 'French (AZERTY)' },
                      { id: 'es', label: 'Spanish' },
                      { id: 'jp', label: 'Japanese' },
                    ].map((k) => (
                      <button
                        key={k.id}
                        onClick={() => setKeyboardLayout(k.id)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          keyboardLayout === k.id
                            ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567] shadow-lg shadow-[#e5b567]/10'
                            : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa] hover:border-[#a4adbe]'
                        }`}
                      >
                        <div className="text-sm font-bold">{k.label}</div>
                        <div className="text-[10px] text-[#a4adbe]">Keymap: {k.id}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: DISK */}
              {wizardStep === 2 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-[#e5b567]" />
                    Step 2: Storage Disk & Partitioning
                  </h3>
                  <p className="text-xs text-[#a4adbe]">
                    Select the target drive where Tinapple OS will be installed:
                  </p>
                  <div className="space-y-2 pt-2">
                    {[
                      { id: '/dev/vda', size: '40.0 GB', model: 'VirtIO Storage (Recommended for VM)' },
                      { id: '/dev/nvme0n1', size: '512.1 GB', model: 'Samsung 980 Pro NVMe' },
                      { id: '/dev/sda', size: '1.0 TB', model: 'Crucial MX500 SATA SSD' },
                    ].map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDisk(d.id)}
                        className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedDisk === d.id
                            ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                            : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa] hover:border-[#a4adbe]'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold flex items-center gap-2">
                            <span>{d.id}</span>
                            <span className="text-xs font-normal text-[#a4adbe]">({d.size})</span>
                          </div>
                          <div className="text-xs text-[#a4adbe] mt-0.5">{d.model}</div>
                        </div>
                        {selectedDisk === d.id && <CheckCircle2 className="w-5 h-5 text-[#e5b567]" />}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-[#353c4a]/50">
                    <div className="text-xs font-bold text-[#f5f6fa] mb-2">Partitioning Scheme:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setDiskStrategy('auto')}
                        className={`p-3 rounded-xl text-left border ${
                          diskStrategy === 'auto'
                            ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                            : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa]'
                        }`}
                      >
                        <div className="text-xs font-bold">Automatic Whole-Disk (Recommended)</div>
                        <div className="text-[10px] text-[#a4adbe] mt-1">
                          Creates 1GB EFI System Partition, 4GB Swap, remainder for Root.
                        </div>
                      </button>

                      <button
                        onClick={() => setDiskStrategy('custom')}
                        className={`p-3 rounded-xl text-left border ${
                          diskStrategy === 'custom'
                            ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                            : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa]'
                        }`}
                      >
                        <div className="text-xs font-bold">Manual Partitioning</div>
                        <div className="text-[10px] text-[#a4adbe] mt-1">
                          Preserve existing partition layout and designate root.
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: FILESYSTEM */}
              {wizardStep === 3 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-[#e5b567]" />
                    Step 3: Root Filesystem
                  </h3>
                  <p className="text-xs text-[#a4adbe]">
                    Choose the filesystem for the primary operating system partition:
                  </p>
                  <div className="space-y-3 pt-2">
                    {[
                      {
                        id: 'btrfs',
                        name: 'Btrfs (Copy-on-Write, Recommended)',
                        desc: 'Subvolumes (@, @home, @snapshots, @var_log), instant zero-cost snapshots, transparent zstd compression.',
                      },
                      {
                        id: 'ext4',
                        name: 'Ext4 (Classic Standard)',
                        desc: 'Rock-solid reliability, proven enterprise standard with standard journaling and wide recovery tool support.',
                      },
                      {
                        id: 'xfs',
                        name: 'XFS (High Performance)',
                        desc: 'Scalable 64-bit journaling filesystem optimized for high concurrency, media servers, and large databases.',
                      },
                    ].map((fs) => (
                      <div
                        key={fs.id}
                        onClick={() => setFilesystem(fs.id as any)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          filesystem === fs.id
                            ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                            : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa] hover:border-[#a4adbe]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{fs.name}</span>
                          {filesystem === fs.id && <Check className="w-4 h-4 text-[#e5b567]" />}
                        </div>
                        <p className="text-xs text-[#a4adbe] mt-1">{fs.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: LUKS2 ENCRYPTION */}
              {wizardStep === 4 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#e5b567]" />
                    Step 4: LUKS2 Full-Disk Encryption
                  </h3>
                  <p className="text-xs text-[#a4adbe]">
                    Protect all operating system data, containers, and credentials at rest:
                  </p>

                  <div className="p-4 rounded-xl bg-[#161a22] border border-[#353c4a] flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#f5f6fa]">
                        Enable LUKS2 Encryption
                      </div>
                      <div className="text-xs text-[#a4adbe] mt-0.5">
                        Uses AES-XTS-PLAIN64 with Argon2id key derivation.
                      </div>
                    </div>
                    <SquishSwitch
                      checked={enableLuks}
                      onChange={setEnableLuks}
                      className="bg-[#222733]"
                    />
                  </div>

                  {enableLuks && (
                    <div className="space-y-3 pt-3">
                      <div>
                        <label className="text-xs font-bold text-[#f5f6fa] block mb-1">
                          Disk Encryption Passphrase:
                        </label>
                        <div className="relative">
                          <input
                            type={showPassphrase ? 'text' : 'password'}
                            value={luksPassphrase}
                            onChange={(e) => setLuksPassphrase(e.target.value)}
                            placeholder="Enter robust encryption passphrase..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-[#f5f6fa] text-xs focus:outline-none focus:border-[#e5b567]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassphrase(!showPassphrase)}
                            className="absolute right-3 top-2.5 text-[#a4adbe] hover:text-[#f5f6fa]"
                          >
                            {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#f5f6fa] block mb-1">
                          Confirm Encryption Passphrase:
                        </label>
                        <input
                          type={showPassphrase ? 'text' : 'password'}
                          value={luksConfirm}
                          onChange={(e) => setLuksConfirm(e.target.value)}
                          placeholder="Re-type passphrase..."
                          className="w-full px-4 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-[#f5f6fa] text-xs focus:outline-none focus:border-[#e5b567]"
                        />
                      </div>

                      {luksPassphrase && luksConfirm && luksPassphrase !== luksConfirm && (
                        <div className="text-xs text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Passphrases do not match!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: BOOTLOADER */}
              {wizardStep === 5 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#e5b567]" />
                    Step 5: Bootloader Selection
                  </h3>
                  <p className="text-xs text-[#a4adbe]">
                    Select the modern firmware bootloader to launch Tinapple OS:
                  </p>

                  <div className="space-y-3 pt-2">
                    <div
                      onClick={() => setBootloader('limine')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        bootloader === 'limine'
                          ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                          : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa] hover:border-[#a4adbe]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">Limine Bootloader (Recommended)</span>
                        {bootloader === 'limine' && <Check className="w-4 h-4 text-[#e5b567]" />}
                      </div>
                      <p className="text-xs text-[#a4adbe] mt-1">
                        Fastest boot times, modern protocol, automatically updates boot configs on
                        kernel installation, high-resolution splash screens.
                      </p>
                    </div>

                    <div
                      onClick={() => setBootloader('grub')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        bootloader === 'grub'
                          ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                          : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa] hover:border-[#a4adbe]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">GRUB (GNU Grand Unified Bootloader)</span>
                        {bootloader === 'grub' && <Check className="w-4 h-4 text-[#e5b567]" />}
                      </div>
                      <p className="text-xs text-[#a4adbe] mt-1">
                        Traditional standard Linux bootloader with extensive filesystem support and
                        rescue shell.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: IDENTITY & USER */}
              {wizardStep === 6 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <User className="w-5 h-5 text-[#e5b567]" />
                    Step 6: System Identity & Admin User
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#f5f6fa] block mb-1">
                        System Hostname:
                      </label>
                      <input
                        type="text"
                        value={hostname}
                        onChange={(e) => setHostname(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-[#f5f6fa] text-xs focus:outline-none focus:border-[#e5b567]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#f5f6fa] block mb-1">
                        Administrative Username:
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-[#f5f6fa] text-xs focus:outline-none focus:border-[#e5b567]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#f5f6fa] block mb-1">
                        User Password:
                      </label>
                      <input
                        type="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-[#f5f6fa] text-xs focus:outline-none focus:border-[#e5b567]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#f5f6fa] block mb-1">
                        Confirm Password:
                      </label>
                      <input
                        type="password"
                        value={userConfirm}
                        onChange={(e) => setUserConfirm(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#161a22] border border-[#353c4a] text-[#f5f6fa] text-xs focus:outline-none focus:border-[#e5b567]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-[#161a22] border border-[#353c4a] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableSudo}
                        onChange={(e) => setEnableSudo(e.target.checked)}
                        className="rounded border-[#353c4a] text-[#e5b567] focus:ring-0"
                      />
                      <span className="text-xs font-bold text-[#f5f6fa]">
                        Grant administrative (sudo) privileges to this user
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-[#161a22] border border-[#353c4a] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameRootPass}
                        onChange={(e) => setSameRootPass(e.target.checked)}
                        className="rounded border-[#353c4a] text-[#e5b567] focus:ring-0"
                      />
                      <span className="text-xs font-bold text-[#f5f6fa]">
                        Use the same password for system root account
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 7: KERNEL */}
              {wizardStep === 7 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-[#e5b567]" />
                    Step 7: Linux Kernel Selection
                  </h3>
                  <p className="text-xs text-[#a4adbe]">
                    Choose the Linux kernel branch tailored for your workload:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {[
                      {
                        id: 'lts',
                        name: 'Linux LTS (Recommended)',
                        desc: 'Long-Term Support kernel with verified enterprise stability and maximum uptime.',
                      },
                      {
                        id: 'current',
                        name: 'Linux (Standard Current)',
                        desc: 'Latest vanilla upstream Linux kernel with bleeding-edge hardware drivers.',
                      },
                      {
                        id: 'hardened',
                        name: 'Linux Hardened',
                        desc: 'Security-focused kernel patches with extensive memory mitigation features.',
                      },
                      {
                        id: 'zen',
                        name: 'Linux Zen',
                        desc: 'Tuned for interactive desktop responsiveness and low-latency scheduling.',
                      },
                    ].map((k) => (
                      <div
                        key={k.id}
                        onClick={() => setKernel(k.id as any)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          kernel === k.id
                            ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                            : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa] hover:border-[#a4adbe]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{k.name}</span>
                          {kernel === k.id && <Check className="w-4 h-4 text-[#e5b567]" />}
                        </div>
                        <p className="text-xs text-[#a4adbe] mt-1">{k.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 8: PROFILES */}
              {wizardStep === 8 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#e5b567]" />
                    Step 8: Appliance Profiles & Desktop Stacks
                  </h3>
                  <p className="text-xs text-[#a4adbe]">
                    Toggle desktop components and homelab application services to bundle:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {[
                      {
                        id: 'base',
                        title: '󰣇 Base Core',
                        desc: 'Essential CLI, zsh, vim, openssh, NetworkManager, sudo, pacman tools (Default).',
                      },
                      {
                        id: 'desktop',
                        title: ' Niri Wayland Station',
                        desc: 'Scrollable-tiling Wayland compositor, Waybar V3.1a theme, Matugen dynamic colors, fuzzel, foot.',
                      },
                      {
                        id: 'media',
                        title: '󰕼 Media Server',
                        desc: 'Jellyfin media server, hardware VA-API transcoding, DLNA media hub.',
                      },
                      {
                        id: 'downloads',
                        title: ' Download Automation',
                        desc: 'qBittorrent-nox daemon, Transmission CLI, automated torrent webui.',
                      },
                      {
                        id: 'backups',
                        title: '󰆓 Automated Backups',
                        desc: 'Restic, BorgBackup, Syncthing synchronization, rclone cloud storage.',
                      },
                      {
                        id: 'network',
                        title: '󰖩 Homelab Networking',
                        desc: 'Tailscale mesh VPN, WireGuard tools, Unbound caching DNS resolver.',
                      },
                      {
                        id: 'infrastructure',
                        title: '󰄛 Observability & Monitoring',
                        desc: 'Prometheus metrics, Grafana dashboards, node-exporter daemon.',
                      },
                      {
                        id: 'databases',
                        title: ' Database Suite',
                        desc: 'PostgreSQL, MariaDB, Valkey/Redis cache, InfluxDB time-series.',
                      },
                    ].map((p) => {
                      const isChecked = selectedProfiles.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleProfile(p.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[#161a22] border-[#e5b567] text-[#e5b567]'
                              : 'bg-[#161a22]/50 border-[#353c4a] text-[#f5f6fa] hover:border-[#a4adbe]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">{p.title}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-[#353c4a] text-[#e5b567] focus:ring-0"
                            />
                          </div>
                          <p className="text-xs text-[#a4adbe] mt-1">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 9: REVIEW & DEPLOY */}
              {wizardStep === 9 && (
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-[#f5f6fa] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#7ec789]" />
                    Step 9: Review & Commit Installation
                  </h3>

                  <div className="bg-[#161a22] p-4 rounded-xl border border-[#353c4a] space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Target Drive:</span>
                      <span className="text-[#e5b567] font-bold">{selectedDisk} ({diskStrategy})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Filesystem:</span>
                      <span className="text-[#f5f6fa] font-bold">{filesystem.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">LUKS2 Encryption:</span>
                      <span className={enableLuks ? 'text-[#7ec789] font-bold' : 'text-[#a4adbe]'}>
                        {enableLuks ? 'Enabled (AES-XTS-PLAIN64)' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Bootloader:</span>
                      <span className="text-[#f5f6fa] font-bold">{bootloader.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Hostname / User:</span>
                      <span className="text-[#f5f6fa] font-bold">{hostname} / {username}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#353c4a]/40">
                      <span className="text-[#a4adbe]">Kernel Branch:</span>
                      <span className="text-[#f5f6fa] font-bold">Linux {kernel.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#a4adbe]">Profiles:</span>
                      <span className="text-[#7ec789] font-bold">{selectedProfiles.join(', ')}</span>
                    </div>
                  </div>

                  {/* Progress / Execution Console */}
                  {isInstalling && (
                    <div className="p-4 rounded-xl bg-[#060709] border border-[#353c4a] space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#e5b567] font-bold flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deploying Appliance...
                        </span>
                        <span className="text-[#f5f6fa] font-bold">{installProgress}%</span>
                      </div>
                      <div className="w-full bg-[#161a22] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#e5b567] to-[#7ec789] h-full transition-all duration-300"
                          style={{ width: `${installProgress}%` }}
                        />
                      </div>
                      <div className="h-28 overflow-y-auto font-mono text-[11px] text-[#a4adbe] space-y-1 bg-[#0b0c0e] p-2 rounded-lg border border-[#353c4a]/40">
                        {installLog.map((log, i) => (
                          <div key={i}>{log}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {installComplete && (
                    <div className="p-4 rounded-xl bg-[#7ec789]/10 border border-[#7ec789]/40 text-[#7ec789] flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 shrink-0" />
                      <div>
                        <div className="text-sm font-bold">Installation Succeeded!</div>
                        <div className="text-xs text-[#a4adbe] mt-0.5">
                          Tinapple OS is installed. You can now reboot into your new system.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#353c4a]/50 font-mono">
                {wizardStep > 1 ? (
                  <button
                    disabled={isInstalling}
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#161a22] text-[#a4adbe] hover:text-[#f5f6fa] border border-[#353c4a] text-xs font-bold transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 9 ? (
                  <button
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e5b567] text-[#060709] font-bold text-xs hover:bg-[#f5c77e] transition-all shadow-md shadow-[#e5b567]/20"
                  >
                    <span>Next Stage</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  !installComplete && (
                    <button
                      disabled={isInstalling}
                      onClick={runInstallSimulation}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#7ec789] text-[#060709] font-black text-xs hover:bg-[#92d89c] transition-all shadow-lg shadow-[#7ec789]/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Commit & Install Appliance OS
                    </button>
                  )
                )}
              </div>
            </SpotlightCard>
          </motion.div>
        )}

        {/* ================= TWEAKS TAB ================= */}
        {activeTab === 'tweaks' && (
          <motion.div
            key="tweaks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 font-mono"
          >
            {tweakStatus && (
              <div className="p-3 rounded-xl bg-[#e5b567]/10 border border-[#e5b567]/40 text-[#e5b567] text-xs font-bold">
                {tweakStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SpotlightCard
                spotlightColor="rgba(229, 181, 103, 0.12)"
                borderColor="rgba(229, 181, 103, 0.3)"
                className="p-5 bg-[#0e1116] border-[#353c4a]"
              >
                <h4 className="text-sm font-bold text-[#f5f6fa] mb-1">Update Pacman Mirrors</h4>
                <p className="text-xs text-[#a4adbe] mb-4">
                  Rate Arch Linux mirror servers by lowest network latency and refresh database.
                </p>
                <button
                  onClick={() => runTweakAction('Mirror Refresh', 'rate-mirrors arch')}
                  className="px-4 py-2 rounded-xl bg-[#161a22] text-[#e5b567] border border-[#353c4a] text-xs font-bold hover:bg-[#222733]"
                >
                  ⚡ Optimize Mirrors
                </button>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(126, 199, 137, 0.12)"
                borderColor="rgba(126, 199, 137, 0.3)"
                className="p-5 bg-[#0e1116] border-[#353c4a]"
              >
                <h4 className="text-sm font-bold text-[#f5f6fa] mb-1">Clear Package Cache</h4>
                <p className="text-xs text-[#a4adbe] mb-4">
                  Safely remove uninstalled and stale ALPM cache tarballs using paccache.
                </p>
                <button
                  onClick={() => runTweakAction('Cache Cleaning', 'paccache -rk1')}
                  className="px-4 py-2 rounded-xl bg-[#161a22] text-[#7ec789] border border-[#353c4a] text-xs font-bold hover:bg-[#222733]"
                >
                  🧹 Clean Cache
                </button>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(122, 162, 247, 0.12)"
                borderColor="rgba(122, 162, 247, 0.3)"
                className="p-5 bg-[#0e1116] border-[#353c4a]"
              >
                <h4 className="text-sm font-bold text-[#f5f6fa] mb-1">Rebuild Initramfs</h4>
                <p className="text-xs text-[#a4adbe] mb-4">
                  Regenerate early userspace initramfs images for all installed Linux kernels.
                </p>
                <button
                  onClick={() => runTweakAction('Initramfs Build', 'mkinitcpio -P')}
                  className="px-4 py-2 rounded-xl bg-[#161a22] text-blue-400 border border-[#353c4a] text-xs font-bold hover:bg-[#222733]"
                >
                  ⚙ Rebuild Images
                </button>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(229, 181, 103, 0.12)"
                borderColor="rgba(229, 181, 103, 0.3)"
                className="p-5 bg-[#0e1116] border-[#353c4a]"
              >
                <h4 className="text-sm font-bold text-[#f5f6fa] mb-1">Restart Waybar Session</h4>
                <p className="text-xs text-[#a4adbe] mb-4">
                  Reload Waybar V3.1a configuration and re-apply dynamic Matugen CSS color palette.
                </p>
                <button
                  onClick={() => runTweakAction('Waybar Reload', 'omarchy-restart-waybar')}
                  className="px-4 py-2 rounded-xl bg-[#161a22] text-[#e5b567] border border-[#353c4a] text-xs font-bold hover:bg-[#222733]"
                >
                   Reload Waybar
                </button>
              </SpotlightCard>
            </div>
          </motion.div>
        )}

        {/* ================= SHORTCUTS TAB ================= */}
        {activeTab === 'shortcuts' && (
          <motion.div
            key="shortcuts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 font-mono"
          >
            <SpotlightCard
              spotlightColor="rgba(229, 181, 103, 0.1)"
              borderColor="rgba(229, 181, 103, 0.3)"
              className="p-6 bg-[#0e1116] border-[#353c4a]"
            >
              <h3 className="text-base font-bold text-[#f5f6fa] mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[#e5b567]" />
                Niri & Waybar Desktop Shortcut Reference
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {[
                  { key: 'Super + Return', desc: 'Launch Foot Hardware-Accelerated Terminal' },
                  { key: 'Super + D / Space', desc: 'Fuzzel Application Launcher' },
                  { key: 'Super + Q', desc: 'Close Focused Window' },
                  { key: 'Super + Left / Right', desc: 'Scroll Column Left / Right' },
                  { key: 'Super + H / J / K / L', desc: 'Vim-style Focus Navigation' },
                  { key: 'Super + Ctrl + Left / Right', desc: 'Move Window Across Columns' },
                  { key: 'Super + O', desc: 'Toggle Niri Workspace Overview' },
                  { key: 'Super + 1 .. 9', desc: 'Switch directly to Workspace 1 through 9' },
                  { key: 'Super + Shift + /', desc: 'Display Niri Built-in Hotkey Overlay' },
                  { key: 'Super + Alt + Space', desc: 'Omarchy System & Power Menu' },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#161a22] border border-[#353c4a] flex items-center justify-between"
                  >
                    <span className="text-[#a4adbe]">{s.desc}</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-[#222733] border border-[#353c4a] text-[#e5b567] font-bold">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default WelcomeInstaller;
