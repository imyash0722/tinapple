import React from 'react';
import {
  Activity,
  Layers,
  ShoppingBag,
  Cpu,
  Settings,
  Sparkles,
  BookOpen,
  Palette,
  Shield,
  Wrench,
  Clock,
  ArrowUpCircle,
  Power,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Terminal,
  Monitor,
  Timer,
  Server,
  Zap,
} from 'lucide-react';
import { SystemInfo, ServiceInfo } from '../../types/api';
import { ShinyText } from '../reactbits/ShinyText';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  displayServices: ServiceInfo[];
  systemInfo: SystemInfo;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenGuides: () => void;
  onOpenAppearance: () => void;
  onOpenTailscale: () => void;
  onRunUpdate: () => void;
  isUpdatingSystem: boolean;
  onSyncClock: () => void;
  isSyncing: boolean;
  clockSynced: boolean;
  onReboot: () => void;
  isRebooting: boolean;
  rebootDeadline: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
  displayServices,
  systemInfo,
  isEditMode,
  setIsEditMode,
  onOpenGuides,
  onOpenAppearance,
  onOpenTailscale,
  onRunUpdate,
  isUpdatingSystem,
  onSyncClock,
  isSyncing,
  clockSynced,
  onReboot,
  isRebooting,
  rebootDeadline,
}) => {
  const activeServicesCount = displayServices.filter((s) => s.activeState === 'active').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      desc: 'Telemetry & Matrix',
      icon: <Activity className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'services',
      label: 'Services',
      desc: 'Appliance Daemons',
      icon: <Layers className="w-5 h-5 shrink-0" />,
      badge: activeServicesCount > 0 ? activeServicesCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'store',
      label: 'App Store',
      desc: 'Packs & Stacks',
      icon: <ShoppingBag className="w-5 h-5 shrink-0" />,
      badge: 'Packs',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'hardware',
      label: 'Hardware',
      desc: 'Sensors & TPM',
      icon: <Cpu className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      desc: 'Node & Manifest',
      icon: <Settings className="w-5 h-5 shrink-0" />,
    },
  ];

  if (!systemInfo.installed) {
    navItems.unshift({
      id: 'welcome',
      label: 'Installer',
      desc: 'Setup Wizard',
      icon: <Sparkles className="w-5 h-5 shrink-0 text-tinapple-gold" />,
      badge: 'New',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    });
  }

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none font-sans text-slate-200">
      {/* 1. Header / Brand Identity */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
          <div
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Logo Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 via-sky-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-tinapple-gold/40 transition-colors">
              <span className="text-lg">🍎</span>
            </div>

            {!collapsed && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-base text-white tracking-tight">tinapple</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-tinapple-gold font-bold">
                    v0.0.1
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[110px]">{systemInfo.hostname || 'appliance-node'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Close on Mobile / Collapse on Desktop */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2. Primary Navigation Section */}
        <div className="px-3 py-4 space-y-1">
          <div className={`px-2 mb-2 text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-500 ${collapsed ? 'text-center' : ''}`}>
            {collapsed ? '•••' : 'Navigation'}
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-tinapple-gold/20 to-tinapple-gold/5 border border-tinapple-gold/40 text-tinapple-gold font-bold shadow-md shadow-tinapple-gold/10'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                <div className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-tinapple-gold' : 'text-zinc-400 group-hover:text-white'}`}>
                  {item.icon}
                </div>

                {!collapsed && (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate text-left text-xs font-semibold">{item.label}</span>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${item.badgeColor || 'bg-white/10 text-zinc-300 border-white/20'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsed Active Indicator Dot */}
                {collapsed && isActive && (
                  <div className="absolute right-1 w-1.5 h-1.5 rounded-full bg-tinapple-gold" />
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Utilities & Homelab Tools Section */}
        <div className="px-3 pt-2 space-y-1 border-t border-white/[0.06]">
          <div className={`px-2 mb-2 text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-500 ${collapsed ? 'text-center' : ''}`}>
            {collapsed ? '•••' : 'Appliance Tools'}
          </div>

          <button
            onClick={() => {
              onOpenGuides();
              setMobileOpen(false);
            }}
            title="Interactive Guides (Jellyseerr, Navidrome, AdGuard, etc.)"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 border border-purple-500/20 transition-all group"
          >
            <BookOpen className="w-5 h-5 shrink-0 text-purple-400 group-hover:scale-110 transition-transform" />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs">Stack Guides</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold">
                  Docs
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => {
              onOpenAppearance();
              setMobileOpen(false);
            }}
            title="Appearance, Wallpapers & Theme Studio"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent transition-all group"
          >
            <Palette className="w-5 h-5 shrink-0 text-sky-400 group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="font-semibold text-xs">Appearance & Walls</span>}
          </button>

          <button
            onClick={() => {
              onOpenTailscale();
              setMobileOpen(false);
            }}
            title="Tailscale VPN Mesh"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-sky-300 hover:bg-sky-500/10 border border-transparent transition-all group"
          >
            <Shield className="w-5 h-5 shrink-0 text-sky-400 group-hover:scale-110 transition-transform" />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs">Tailscale Mesh</span>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              </div>
            )}
          </button>

          {activeTab === 'dashboard' && (
            <button
              onClick={() => setIsEditMode((prev) => !prev)}
              title={isEditMode ? 'Exit Edit Mode' : 'Customize Dashboard Layout'}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all group ${
                isEditMode
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <Wrench className="w-5 h-5 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs">{isEditMode ? 'Editing Deck' : 'Edit Deck'}</span>
                  {isEditMode && <span className="text-[10px] text-amber-400 font-bold">ON</span>}
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 4. Bottom System Status & Node Controls */}
      <div className="p-3 border-t border-white/[0.08] space-y-2 bg-black/20">
        {!collapsed ? (
          <>
            {/* System Node Info Card */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] font-mono space-y-1.5">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Uptime:</span>
                </span>
                <span className="font-semibold text-zinc-200">{formatUptime(systemInfo.uptime)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  {systemInfo.sessionMode === 'headless' ? (
                    <Terminal className="w-3.5 h-3.5 text-tinapple-gold" />
                  ) : (
                    <Monitor className="w-3.5 h-3.5 text-tinapple-gold" />
                  )}
                  <span>Mode:</span>
                </span>
                <span className="capitalize font-semibold text-zinc-200">{systemInfo.sessionMode}</span>
              </div>
            </div>

            {/* System Actions Row */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {/* 1. Update OS */}
              <button
                onClick={onRunUpdate}
                disabled={isUpdatingSystem}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 font-mono text-[10px] transition-all disabled:opacity-50 active:scale-95"
                title="Synchronize System & Appliance Packages (paru/pacman update)"
              >
                <ArrowUpCircle className={`w-4 h-4 mb-1 text-emerald-400 ${isUpdatingSystem ? 'animate-spin' : ''}`} />
                <span>Update</span>
              </button>

              {/* 2. Clock Sync */}
              <button
                onClick={onSyncClock}
                disabled={isSyncing}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-mono text-[10px] transition-all disabled:opacity-50 active:scale-95"
                title="Sync Network Time (NTP)"
              >
                {clockSynced ? (
                  <Check className="w-4 h-4 mb-1 text-emerald-400" />
                ) : (
                  <Clock className={`w-4 h-4 mb-1 text-tinapple-gold ${isSyncing ? 'animate-spin' : ''}`} />
                )}
                <span>TimeSync</span>
              </button>

              {/* 3. Reboot */}
              <button
                onClick={onReboot}
                disabled={isRebooting}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border font-mono text-[10px] transition-all disabled:opacity-50 active:scale-95 ${
                  rebootDeadline
                    ? 'bg-red-500/25 border-red-500/50 text-red-300 animate-pulse'
                    : 'bg-white/[0.04] hover:bg-red-500/15 border-white/[0.08] hover:border-red-500/30 text-zinc-300 hover:text-red-300'
                }`}
                title={rebootDeadline ? 'Confirm Reboot within 3s' : 'Reboot Appliance Node'}
              >
                <Power className={`w-4 h-4 mb-1 ${rebootDeadline ? 'text-red-400' : 'text-zinc-400'}`} />
                <span>{rebootDeadline ? 'Confirm' : 'Reboot'}</span>
              </button>
            </div>
          </>
        ) : (
          /* Collapsed View Action Stack */
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              onClick={onRunUpdate}
              disabled={isUpdatingSystem}
              className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300"
              title="System & Appliance Update"
            >
              <ArrowUpCircle className={`w-4 h-4 ${isUpdatingSystem ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onSyncClock}
              disabled={isSyncing}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300"
              title="Sync Clock"
            >
              <Clock className="w-4 h-4 text-tinapple-gold" />
            </button>
            <button
              onClick={onReboot}
              disabled={isRebooting}
              className={`p-2.5 rounded-xl border ${rebootDeadline ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-red-300'}`}
              title="Reboot Node"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* A. DESKTOP FIXED SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30 bg-[#060c1c]/92 backdrop-blur-2xl border-r border-white/[0.08] shadow-2xl transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* B. MOBILE DRAWER OVERLAY */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* C. MOBILE DRAWER SLIDE-IN */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#060c1c]/98 backdrop-blur-3xl border-r border-white/10 shadow-2xl transition-transform duration-300 ease-out transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* D. MOBILE BOTTOM NAVIGATION DOCK (Thumb Friendly for Phones) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#050a16]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-1.5 flex items-center justify-around shadow-2xl"
      >
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-tinapple-gold font-bold scale-105'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono">Dashboard</span>
        </button>

        <button
          onClick={() => handleSelectTab('services')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'services'
              ? 'text-tinapple-gold font-bold scale-105'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono">Services</span>
          {activeServicesCount > 0 && (
            <span className="absolute top-0 right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-emerald-500 text-slate-950">
              {activeServicesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleSelectTab('store')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'store'
              ? 'text-tinapple-gold font-bold scale-105'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono">Store</span>
        </button>

        <button
          onClick={() => {
            onOpenGuides();
          }}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-purple-400 hover:text-purple-300 transition-all"
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono">Guides</span>
        </button>

        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all"
        >
          <div className="w-5 h-5 mb-0.5 flex flex-col justify-center items-center gap-1">
            <span className="w-4 h-0.5 bg-current rounded-full" />
            <span className="w-4 h-0.5 bg-current rounded-full" />
            <span className="w-4 h-0.5 bg-current rounded-full" />
          </div>
          <span className="text-[10px] font-mono">More</span>
        </button>
      </nav>
    </>
  );
};
