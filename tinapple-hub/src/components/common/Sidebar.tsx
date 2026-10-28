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
  Network,
} from 'lucide-react';
import { SystemInfo, ServiceInfo } from '../../types/api';

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
  onOpenTerminal?: () => void;
  onOpenTools?: () => void;
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
  onOpenTerminal,
  onOpenTools,
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

  // Render function that cleanly separates desktop collapsed dock vs expanded sidebar/mobile drawer
  const renderSidebarContent = (isDrawer = false) => {
    // When rendered inside the mobile drawer, it is ALWAYS full expanded mode
    const isCollapsed = isDrawer ? false : collapsed;

    return (
      <div className="flex flex-col h-full justify-between select-none font-sans text-slate-200 overflow-y-auto overflow-x-hidden scrollbar-none">
        {/* 1. Header / Brand Identity */}
        <div>
          <div
            className={`border-b border-white/[0.08] transition-all duration-300 ${
              isCollapsed
                ? 'flex flex-col items-center justify-center py-4 px-0 gap-2.5'
                : 'flex items-center justify-between px-4 py-4'
            }`}
          >
            <div
              onClick={() => handleSelectTab('dashboard')}
              className={`flex items-center cursor-pointer group ${
                isCollapsed ? 'justify-center mx-auto' : 'gap-3'
              }`}
              title="tinapple dashboard"
            >
              {/* Logo Icon */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 via-sky-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-tinapple-gold/40 transition-transform group-hover:scale-105 shrink-0">
                <span className="text-xl">🍎</span>
              </div>

              {!isCollapsed && (
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

            {/* Toggle / Close Buttons */}
            {isDrawer ? (
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Close Menu"
                aria-label="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            ) : isCollapsed ? (
              <button
                onClick={() => setCollapsed(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors mx-auto"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 2. Primary Navigation Section */}
          <div className={isCollapsed ? 'py-3 px-2 flex flex-col items-center space-y-2' : 'px-3 py-4 space-y-1'}>
            <div
              className={`text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-500 ${
                isCollapsed ? 'text-center mx-auto w-full select-none py-0.5' : 'px-2 mb-2'
              }`}
            >
              {isCollapsed ? '•••' : 'Navigation'}
            </div>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;

              if (isCollapsed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    title={item.label}
                    className={`w-12 h-12 mx-auto flex items-center justify-center p-0 rounded-2xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-br from-tinapple-gold/25 via-tinapple-gold/15 to-tinapple-gold/5 border border-tinapple-gold/50 text-tinapple-gold shadow-lg shadow-tinapple-gold/20 font-bold scale-[1.03]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    <div
                      className={`shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center ${
                        isActive ? 'text-tinapple-gold' : 'text-zinc-400 group-hover:text-white'
                      }`}
                    >
                      {item.icon}
                    </div>
                  </button>
                );
              }

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
                  <div
                    className={`shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-tinapple-gold' : 'text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    {item.icon}
                  </div>

                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate text-left text-xs font-semibold">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                          item.badgeColor || 'bg-white/10 text-zinc-300 border-white/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3. Utilities & Homelab Tools Section */}
          <div
            className={`border-t border-white/[0.06] ${
              isCollapsed ? 'py-2 px-2 flex flex-col items-center space-y-2' : 'px-3 pt-2 space-y-1'
            }`}
          >
            <div
              className={`text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-500 ${
                isCollapsed ? 'text-center mx-auto w-full select-none py-0.5' : 'px-2 mb-2'
              }`}
            >
              {isCollapsed ? '•••' : 'Appliance Tools'}
            </div>

            {/* Guides Button */}
            <button
              onClick={() => {
                onOpenGuides();
                setMobileOpen(false);
              }}
              title="Interactive Guides (Jellyseerr, Navidrome, AdGuard, etc.)"
              className={`transition-all group ${
                isCollapsed
                  ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 border border-purple-500/20 p-0'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 border border-purple-500/20'
              }`}
            >
              <BookOpen className="w-5 h-5 shrink-0 text-purple-400 group-hover:scale-110 transition-transform" />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs">Stack Guides</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold">
                    Docs
                  </span>
                </div>
              )}
            </button>

            {/* Appearance & Walls */}
            <button
              onClick={() => {
                onOpenAppearance();
                setMobileOpen(false);
              }}
              title="Appearance, Wallpapers & Theme Studio"
              className={`transition-all group ${
                isCollapsed
                  ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent p-0'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <Palette className="w-5 h-5 shrink-0 text-sky-400 group-hover:scale-110 transition-transform" />
              {!isCollapsed && <span className="font-semibold text-xs">Appearance & Walls</span>}
            </button>

            {/* Tailscale Mesh */}
            <button
              onClick={() => {
                onOpenTailscale();
                setMobileOpen(false);
              }}
              title="Tailscale VPN Mesh"
              className={`transition-all group ${
                isCollapsed
                  ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-zinc-400 hover:text-sky-300 hover:bg-sky-500/10 border border-transparent p-0'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-sky-300 hover:bg-sky-500/10 border border-transparent'
              }`}
            >
              <Shield className="w-5 h-5 shrink-0 text-sky-400 group-hover:scale-110 transition-transform" />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs">Tailscale Mesh</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-bold">
                    VPN
                  </span>
                </div>
              )}
            </button>

            {/* Interactive Web Terminal */}
            {onOpenTerminal && (
              <button
                onClick={() => {
                  onOpenTerminal();
                  setMobileOpen(false);
                }}
                title="Interactive Web Terminal (PTY bash shell)"
                className={`transition-all group ${
                  isCollapsed
                    ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent p-0'
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 border border-transparent'
                }`}
              >
                <Terminal className="w-5 h-5 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs">Web Terminal</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                      PTY
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* Server Operations & Port Matrix */}
            {onOpenTools && (
              <button
                onClick={() => {
                  onOpenTools();
                  setMobileOpen(false);
                }}
                title="Server Operations & Port Matrix"
                className={`transition-all group ${
                  isCollapsed
                    ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent p-0'
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-transparent'
                }`}
              >
                <Network className="w-5 h-5 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs">Port Matrix & Tools</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">
                      Ops
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* Edit Deck Layout (Dashboard tab only) */}
            {activeTab === 'dashboard' && (
              <button
                onClick={() => setIsEditMode((prev) => !prev)}
                title={isEditMode ? 'Exit Edit Mode' : 'Customize Dashboard Layout'}
                className={`transition-all group ${
                  isCollapsed
                    ? `w-12 h-12 mx-auto flex items-center justify-center rounded-2xl p-0 ${
                        isEditMode
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                      }`
                    : `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono ${
                        isEditMode
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                      }`
                }`}
              >
                <Wrench className="w-5 h-5 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                {!isCollapsed && (
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
        <div
          className={`border-t border-white/[0.08] bg-black/25 ${
            isDrawer ? 'p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]' : 'p-3'
          }`}
        >
          {!isCollapsed ? (
            <div className="space-y-2">
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
            </div>
          ) : (
            /* Collapsed View Action Stack - perfectly centered column */
            <div className="flex flex-col items-center justify-center gap-2 pt-1 mx-auto">
              <button
                onClick={onRunUpdate}
                disabled={isUpdatingSystem}
                className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 transition-all active:scale-95 disabled:opacity-50"
                title="System & Appliance Update"
              >
                <ArrowUpCircle className={`w-4 h-4 ${isUpdatingSystem ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onSyncClock}
                disabled={isSyncing}
                className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 transition-all active:scale-95 disabled:opacity-50"
                title="Sync Clock"
              >
                {clockSynced ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Clock className={`w-4 h-4 text-tinapple-gold ${isSyncing ? 'animate-spin' : ''}`} />
                )}
              </button>
              <button
                onClick={onReboot}
                disabled={isRebooting}
                className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${
                  rebootDeadline
                    ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-red-300'
                }`}
                title={rebootDeadline ? 'Confirm Reboot' : 'Reboot Node'}
              >
                <Power className={`w-4 h-4 ${rebootDeadline ? 'text-red-400' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* A. DESKTOP FIXED SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30 bg-[#060c1c]/95 backdrop-blur-2xl border-r border-white/[0.08] shadow-2xl transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* B. MOBILE DRAWER OVERLAY */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* C. MOBILE DRAWER SLIDE-IN (Always full expanded view with close button) */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-[51] w-72 max-w-[85vw] bg-[#060c1c]/98 backdrop-blur-3xl border-r border-white/10 shadow-2xl transition-transform duration-300 ease-out transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(true)}
      </div>

      {/* D. MOBILE BOTTOM NAVIGATION DOCK (Thumb Friendly with Safe-Area support) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#050a16]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl"
      >
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
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
          className={`flex-1 relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'services'
              ? 'text-tinapple-gold font-bold scale-105'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 mb-0.5" />
            {activeServicesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[9px] font-mono font-black rounded-full bg-emerald-500 text-slate-950 leading-none">
                {activeServicesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono">Services</span>
        </button>

        <button
          onClick={() => handleSelectTab('store')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'store'
              ? 'text-tinapple-gold font-bold scale-105'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono">Store</span>
        </button>

        <button
          onClick={() => onOpenGuides()}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-purple-400 hover:text-purple-300 transition-all active:scale-95"
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono">Guides</span>
        </button>

        <button
          onClick={() => setMobileOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'hardware' || activeTab === 'settings'
              ? 'text-tinapple-gold font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
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
