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
  ShieldAlert,
  Pin,
  PinOff,
} from 'lucide-react';
import { SystemInfo, ServiceInfo } from '../../types/api';

export interface SidebarProps {
  isLandingPage?: boolean;
  isSidebarPinned?: boolean;
  onTogglePin?: () => void;
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
  onOpenProton?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isLandingPage = false,
  isSidebarPinned = false,
  onTogglePin,
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
  onOpenProton,
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

  // Left-edge hover autohide timer ref
  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleOpenDrawerFromHover = React.useCallback(() => {
    if (isSidebarPinned) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMobileOpen(true);
  }, [isSidebarPinned, setMobileOpen]);

  const handleDrawerMouseEnter = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleDrawerMouseLeave = React.useCallback(() => {
    if (isSidebarPinned) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setMobileOpen(false);
    }, 320); // 320ms grace period for smooth departure
  }, [isSidebarPinned, setMobileOpen]);

  // Window-level proximity detection for desktop screen edge (clientX <= 20px)
  React.useEffect(() => {
    if (isSidebarPinned) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20 && !mobileOpen) {
        handleOpenDrawerFromHover();
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
    };
  }, [isSidebarPinned, mobileOpen, handleOpenDrawerFromHover]);

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
      id: 'guides',
      label: 'Guides',
      desc: 'Documentation & Stacks',
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
      badge: 'Docs',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'hardware',
      label: 'Hardware',
      desc: 'Sensors & TPM',
      icon: <Cpu className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'terminal',
      label: 'Terminal',
      desc: 'PTY Web Shell',
      icon: <Terminal className="w-5 h-5 shrink-0" />,
      badge: 'SSH',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'errors',
      label: 'Error Logger',
      desc: 'Machine & Web Faults',
      icon: <ShieldAlert className="w-5 h-5 shrink-0" />,
      badge: 'AI Logs',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
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
      <div className="flex flex-col h-full justify-between select-none font-sans text-on-surface overflow-y-auto overflow-x-hidden scrollbar-none">
        {/* 1. Header / Brand Identity */}
        <div>
          <div
            className={`border-b border-outline-variant transition-all duration-300 ${
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
              <div className="w-11 h-11 rounded-2xl bg-primary-container border border-outline-variant flex items-center justify-center shadow-none group-hover:border-primary/40 transition-transform group-hover:scale-105 shrink-0">
                <Layers className="w-5 h-5 text-primary" />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-black text-base text-on-surface tracking-tight">tinapple</span>
                    <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-full bg-surface-container-highest border border-outline-variant text-primary font-bold">
                      v0.0.1
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-sans text-on-surface-variant">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate max-w-[110px]">{systemInfo.hostname || 'appliance-node'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle / Close Buttons */}
            {isDrawer ? (
              <div className="flex items-center gap-1">
                {onTogglePin && (
                  <button
                    onClick={onTogglePin}
                    className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    title={isSidebarPinned ? 'Unpin Sidebar (Hidden Drawer Mode)' : 'Pin Sidebar to Desktop'}
                    aria-label={isSidebarPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
                  >
                    {isSidebarPinned ? <PinOff className="w-4 h-4 text-primary" /> : <Pin className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  title="Close Menu (Esc)"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : isCollapsed ? (
              <button
                onClick={() => setCollapsed(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors mx-auto"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
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
              className={`text-[10px] font-sans font-bold tracking-widest uppercase text-on-surface-variant ${
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
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-12 h-12 mx-auto flex items-center justify-center p-0 rounded-full transition-all duration-200 group ${
                      isActive
                        ? 'bg-primary/15 text-primary border border-transparent font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                    }`}
                  >
                    <div
                      className={`shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center ${
                        isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
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
                    aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-sans transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-transparent font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <div
                    className={`shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                    }`}
                  >
                    {item.icon}
                  </div>

                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate text-left text-xs font-semibold">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-sans font-bold rounded-full border ${
                          item.badgeColor || 'bg-surface-container-highest text-on-surface border-outline-variant'
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
            className={`border-t border-outline-variant ${
              isCollapsed ? 'py-2 px-2 flex flex-col items-center space-y-2' : 'px-3 pt-2 space-y-1'
            }`}
          >
            <div
              className={`text-[10px] font-sans font-bold tracking-widest uppercase text-on-surface-variant ${
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
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-sans text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 border border-purple-500/20'
              }`}
            >
              <BookOpen className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
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
                  ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent p-0'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-sans text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
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
                  ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-on-surface-variant hover:text-sky-300 hover:bg-sky-500/10 border border-transparent p-0'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-sans text-on-surface-variant hover:text-sky-300 hover:bg-sky-500/10 border border-transparent'
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

            {/* Proton Privacy Exit Node */}
            {onOpenProton && (
              <button
                onClick={() => {
                  onOpenProton();
                  setMobileOpen(false);
                }}
                title="Proton VPN Privacy Exit Node (Swiss WireGuard & Media Bypass)"
                className={`transition-all group ${
                  isCollapsed
                    ? 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl text-on-surface-variant hover:text-[#a48eff] hover:bg-purple-500/10 border border-transparent p-0'
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-sans text-on-surface-variant hover:text-[#a48eff] hover:bg-purple-500/10 border border-transparent'
                }`}
              >
                <div className="w-5 h-5 shrink-0 flex items-center justify-center rounded-lg bg-purple-500/20 text-[#a48eff] group-hover:scale-110 transition-transform text-xs font-bold">
                  <Shield className="w-3.5 h-3.5 text-[#a48eff]" />
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs">Proton Exit</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold">
                      Swiss
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
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-sans text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-transparent'
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
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                      }`
                    : `w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-sans ${
                        isEditMode
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
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
          className={`border-t border-outline-variant bg-surface-container-lowest ${
            isDrawer ? 'p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]' : 'p-3'
          }`}
        >
          {!isCollapsed ? (
            <div className="space-y-2">
              {/* System Node Info Card */}
              <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant text-[11px] font-sans space-y-1.5">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span>Uptime:</span>
                  </span>
                  <span className="font-semibold text-on-surface">{formatUptime(systemInfo.uptime)}</span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    {systemInfo.sessionMode === 'headless' ? (
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Mode:</span>
                  </span>
                  <span className="capitalize font-semibold text-on-surface">{systemInfo.sessionMode}</span>
                </div>
              </div>

              {/* System Actions Row */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {/* 1. Update OS */}
                <button
                  onClick={onRunUpdate}
                  disabled={isUpdatingSystem}
                  className="flex flex-col items-center justify-center p-2 rounded-[12px] bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-sans text-[10px] transition-all disabled:opacity-50 active:scale-95"
                  title="Synchronize System & Appliance Packages (paru/pacman update)"
                >
                  <ArrowUpCircle className={`w-4 h-4 mb-1 text-emerald-400 ${isUpdatingSystem ? 'animate-spin' : ''}`} />
                  <span>Update</span>
                </button>

                {/* 2. Clock Sync */}
                <button
                  onClick={onSyncClock}
                  disabled={isSyncing}
                  className="flex flex-col items-center justify-center p-2 rounded-[12px] bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface font-sans text-[10px] transition-all disabled:opacity-50 active:scale-95"
                  title="Sync Network Time (NTP)"
                >
                  {clockSynced ? (
                    <Check className="w-4 h-4 mb-1 text-emerald-400" />
                  ) : (
                    <Clock className={`w-4 h-4 mb-1 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
                  )}
                  <span>TimeSync</span>
                </button>

                {/* 3. Reboot */}
                <button
                  onClick={onReboot}
                  disabled={isRebooting}
                  className={`flex flex-col items-center justify-center p-2 rounded-[12px] border font-sans text-[10px] transition-all disabled:opacity-50 active:scale-95 ${
                    rebootDeadline
                      ? 'bg-red-500/25 border-red-500/50 text-red-300 animate-pulse'
                      : 'bg-surface-container-highest hover:bg-red-500/15 border-outline-variant hover:border-red-500/30 text-on-surface hover:text-red-300'
                  }`}
                  title={rebootDeadline ? 'Confirm Reboot within 3s' : 'Reboot Appliance Node'}
                >
                  <Power className={`w-4 h-4 mb-1 ${rebootDeadline ? 'text-red-400' : 'text-on-surface-variant'}`} />
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
                className="w-11 h-11 mx-auto flex items-center justify-center rounded-[12px] bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition-all active:scale-95 disabled:opacity-50"
                title="System & Appliance Update"
              >
                <ArrowUpCircle className={`w-4 h-4 ${isUpdatingSystem ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onSyncClock}
                disabled={isSyncing}
                className="w-11 h-11 mx-auto flex items-center justify-center rounded-[12px] bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface transition-all active:scale-95 disabled:opacity-50"
                title="Sync Clock"
              >
                {clockSynced ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Clock className={`w-4 h-4 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
                )}
              </button>
              <button
                onClick={onReboot}
                disabled={isRebooting}
                className={`w-11 h-11 mx-auto flex items-center justify-center rounded-[12px] border transition-all active:scale-95 disabled:opacity-50 ${
                  rebootDeadline
                    ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                    : 'bg-surface-container-highest border-outline-variant text-on-surface-variant hover:text-red-300'
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
      {/* 0. LEFT-EDGE HOVER HOT ZONE (Desktop: Hover left edge to appear) */}
      {!isSidebarPinned && (
        <div
          role="button"
          tabIndex={-1}
          aria-label="Hover left edge to open appliance navigation"
          className="hidden md:block fixed top-0 bottom-0 left-0 w-5 z-40 group cursor-pointer"
          onMouseEnter={handleOpenDrawerFromHover}
          title="Hover left edge to open appliance navigation"
        >
          {/* Subtle indicator bar on edge proximity */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-24 rounded-r-full bg-tinapple-gold/0 group-hover:bg-tinapple-gold/60 transition-all duration-300 pointer-events-none shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
        </div>
      )}

      {/* A. DESKTOP FIXED SIDEBAR (Hidden on all tabs by default, shown only if pinned by user) */}
      {isSidebarPinned && !isLandingPage && (
        <aside
          className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30 bg-surface-container-low border-r border-outline-variant shadow-none transition-all duration-300 ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          {renderSidebarContent(false)}
        </aside>
      )}

      {/* B. DRAWER OVERLAY (Active on all tabs when drawer is open) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
          onMouseEnter={handleDrawerMouseLeave}
        />
      )}

      {/* C. DRAWER SLIDE-IN (Slide-over drawer for all tabs with auto-hide on leave) */}
      <div
        onMouseEnter={handleDrawerMouseEnter}
        onMouseLeave={handleDrawerMouseLeave}
        className={`fixed inset-y-0 left-0 z-[51] w-72 max-w-[85vw] bg-surface-container-low border-r border-outline-variant shadow-none transition-transform duration-300 ease-out transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarPinned && !isLandingPage ? 'md:hidden' : ''}`}
      >
        {renderSidebarContent(true)}
      </div>

      {/* D. MOBILE BOTTOM NAVIGATION DOCK (Thumb Friendly with Safe-Area support) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-low border-t border-outline-variant px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-none"
      >
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-primary font-bold scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">Dashboard</span>
        </button>

        <button
          onClick={() => handleSelectTab('services')}
          className={`flex-1 relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'services'
              ? 'text-primary font-bold scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 mb-0.5" />
            {activeServicesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[9px] font-sans font-black rounded-full bg-emerald-500 text-slate-950 leading-none">
                {activeServicesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-sans">Services</span>
        </button>

        <button
          onClick={() => handleSelectTab('store')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'store'
              ? 'text-primary font-bold scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">Store</span>
        </button>

        <button
          onClick={() => handleSelectTab('guides')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'guides'
              ? 'text-primary font-bold scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">Guides</span>
        </button>

        <button
          onClick={() => setMobileOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'hardware' || activeTab === 'settings'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="w-5 h-5 mb-0.5 flex flex-col justify-center items-center gap-1">
            <span className="w-4 h-0.5 bg-current rounded-full" />
            <span className="w-4 h-0.5 bg-current rounded-full" />
            <span className="w-4 h-0.5 bg-current rounded-full" />
          </div>
          <span className="text-[10px] font-sans">More</span>
        </button>
      </nav>
    </>
  );
});
