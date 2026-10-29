import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Sliders,
  Globe,
  Lock,
  Plus,
  UserPlus,
} from 'lucide-react';
import { api } from '../../services/api';
import { UserManagementData, TailscaleUserItem } from '../../types/api';

export const TailscaleUserManager: React.FC = () => {
  const [data, setData] = useState<UserManagementData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showAddUser, setShowAddUser] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('admin');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUserManagement();
      setData(res);

      // Initialize selected permissions for each user
      const perms: Record<string, string[]> = {};
      res.tailscale_users.forEach((u) => {
        perms[u.login_name] = u.allowed_services || [];
      });
      setSelectedPerms(perms);
    } catch {
      setMessage({ text: 'Failed to load user management data', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (targetUser: string, newRole: string) => {
    setIsUpdating(true);
    setMessage(null);
    const ok = await api.updateUserRole(targetUser, newRole);
    if (ok) {
      setMessage({ text: `Updated role for ${targetUser} to ${newRole.toUpperCase()}`, type: 'success' });
      await fetchData();
    } else {
      setMessage({ text: 'Failed to update user role', type: 'error' });
    }
    setIsUpdating(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsUpdating(true);
    setMessage(null);
    try {
      const ok = await api.addUser(newEmail.trim(), newRole);
      if (ok) {
        setMessage({ text: `Granted ${newRole.toUpperCase()} access to ${newEmail.trim()}`, type: 'success' });
        setNewEmail('');
        setShowAddUser(false);
        await fetchData();
      } else {
        setMessage({ text: 'Failed to add user or grant role', type: 'error' });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleService = (userLogin: string, serviceId: string) => {
    const current = selectedPerms[userLogin] || [];
    const updated = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId];

    setSelectedPerms((prev) => ({
      ...prev,
      [userLogin]: updated,
    }));
  };

  const handleSavePermissions = async (userLogin: string) => {
    setIsUpdating(true);
    setMessage(null);
    const perms = selectedPerms[userLogin] || [];
    const ok = await api.updateUserPermissions(userLogin, perms);
    if (ok) {
      setMessage({ text: `Saved service access permissions for ${userLogin}`, type: 'success' });
      await fetchData();
    } else {
      setMessage({ text: 'Failed to save permissions', type: 'error' });
    }
    setIsUpdating(false);
  };

  const handleToggleGuestTor = async () => {
    if (!data) return;
    setIsUpdating(true);
    setMessage(null);
    const newPolicy = !data.hide_tor_exit_for_guests;
    const ok = await api.updateGuestTorExit(newPolicy);
    if (ok) {
      setData((prev) => (prev ? { ...prev, hide_tor_exit_for_guests: newPolicy } : null));
      setMessage({
        text: newPolicy ? 'Guest Tor Exit hidden for non-admin viewers' : 'Guest Tor Exit visible for viewers',
        type: 'success',
      });
    } else {
      setMessage({ text: 'Failed to update guest Tor policy', type: 'error' });
    }
    setIsUpdating(false);
  };

  const getDeviceIcon = (os: string) => {
    const o = (os || '').toLowerCase();
    if (o.includes('android') || o.includes('ios')) {
      return <Smartphone className="w-3.5 h-3.5 text-sky-400" />;
    }
    return <Laptop className="w-3.5 h-3.5 text-zinc-300" />;
  };

  if (isLoading && !data) {
    return (
      <div className="tinapple-glass-card rounded-2xl p-6 border border-white/[0.08] flex items-center justify-center gap-3 text-zinc-400 font-mono text-sm">
        <RefreshCw className="w-5 h-5 animate-spin text-tinapple-gold" />
        <span>Loading Tailscale Mesh Identity & RBAC Matrix...</span>
      </div>
    );
  }

  const currentUser = data?.current_user;
  const isOwner = currentUser?.is_owner || currentUser?.role === 'owner';
  const canManageAccess = data?.can_manage_site_access || isOwner;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Identity */}
      <div className="tinapple-glass-card rounded-2xl p-5 sm:p-6 border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 via-purple-500/20 to-amber-500/20 border border-white/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Tailscale Mesh & User RBAC</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  Mesh Identity
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Role-based access control sealed to Tailscale mesh logins and peer hardware keys.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isOwner && (
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs shadow-md transition-all active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddUser ? 'Cancel' : 'Grant Control / Add User'}</span>
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={isLoading || isUpdating}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 transition-colors"
              title="Refresh Tailnet status"
            >
              <RefreshCw className={`w-4 h-4 text-tinapple-gold ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Add User / Grant Control Form */}
        {showAddUser && (
          <form
            onSubmit={handleAddUser}
            className="mt-4 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center gap-2.5 bg-slate-950/70 p-3.5 rounded-xl border border-tinapple-gold/30 animate-in fade-in"
          >
            <div className="flex-1 w-full">
              <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                Shared User Tailscale Email:
              </label>
              <input
                type="email"
                placeholder="imyashlinux@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-tinapple-gold"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="text-[10px] text-zinc-400 font-mono block mb-1">
                Assigned Role:
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'viewer')}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-tinapple-gold cursor-pointer"
              >
                <option value="admin">🛡️ Administrator</option>
                <option value="viewer">👁️ Viewer / Guest</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isUpdating || !newEmail.trim()}
              className="w-full sm:w-auto mt-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
              {isUpdating ? 'Saving...' : 'Authorize User'}
            </button>
          </form>
        )}

        {/* Current User Session Status Pill */}
        {currentUser && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-zinc-500">Active Session:</span>
              <span className="font-bold text-white">{currentUser.display_name || currentUser.login_name}</span>
              <span className="text-zinc-500">({currentUser.device_ip})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Tier:</span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border ${
                  currentUser.role === 'owner'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : currentUser.role === 'admin'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    : 'bg-zinc-700/50 text-zinc-300 border-zinc-600/50'
                }`}
              >
                {currentUser.role === 'owner' ? '👑 Owner' : currentUser.role === 'admin' ? '🛡️ Admin' : '👁️ Viewer'}
              </span>
            </div>
          </div>
        )}

        {/* Action / Notification Banner */}
        {message && (
          <div
            className={`mt-4 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border-red-500/20'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. Global Guest Tor Exit Policy (Tinarchy Feature) */}
      <div className="tinapple-glass-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] bg-slate-900/40 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Guest Tor Onion Routing Policy
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Restrict Tor anonymization proxy & exit nodes exclusively to authenticated Admins and Owner.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleGuestTor}
            disabled={!canManageAccess || isUpdating}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
              data?.hide_tor_exit_for_guests
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
            } disabled:opacity-50`}
          >
            {data?.hide_tor_exit_for_guests ? '🔒 Hidden from Guests (Enforced)' : '🔓 Visible to All Peers'}
          </button>
        </div>
      </div>

      {/* 3. Tailscale Users List & Granular Access Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-mono uppercase font-bold text-zinc-400 tracking-wider">
            Connected Tailnet Accounts ({data?.tailscale_users.length || 0})
          </h4>
          <span className="text-[11px] font-mono text-zinc-500">Auto-synced with tailscaled</span>
        </div>

        {data?.tailscale_users.map((user: TailscaleUserItem) => {
          const isUserExpanded = expandedUser === user.login_name;
          const userPerms = selectedPerms[user.login_name] || [];

          return (
            <div
              key={user.login_name}
              className={`tinapple-glass-card rounded-2xl border transition-all overflow-hidden ${
                user.is_owner
                  ? 'border-amber-500/30 bg-amber-500/[0.02]'
                  : 'border-white/[0.08] bg-slate-900/40 hover:border-white/20'
              }`}
            >
              {/* Card Header Row */}
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Avatar or Initial */}
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.display_name}
                      className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/10 flex items-center justify-center text-sm font-mono font-bold text-white shrink-0">
                      {(user.display_name || user.login_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm truncate">{user.display_name}</span>
                      {user.is_owner && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                          👑 Host Owner
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 font-mono truncate block">{user.login_name}</span>
                  </div>
                </div>

                {/* Right: Device Badges & Role Controls */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  {/* Connected Devices Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300">
                    <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{user.devices?.length || 0} devices</span>
                  </div>

                  {/* Role Selector */}
                  {user.is_owner ? (
                    <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                      Full Control
                    </div>
                  ) : isOwner ? (
                    <select
                      value={user.role}
                      disabled={isUpdating}
                      onChange={(e) => handleRoleChange(user.login_name, e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-tinapple-gold cursor-pointer"
                    >
                      <option value="admin">🛡️ Administrator</option>
                      <option value="viewer">👁️ Viewer / Guest</option>
                    </select>
                  ) : (
                    <div className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-mono text-zinc-300 uppercase">
                      {user.role}
                    </div>
                  )}

                  {/* Expand / Details Toggle */}
                  <button
                    onClick={() => setExpandedUser(isUserExpanded ? null : user.login_name)}
                    className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                    title={isUserExpanded ? 'Collapse user details' : 'Expand hardware & service permissions'}
                  >
                    {isUserExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expandable Details Tray: Hardware Peer Devices & Service Access Checklist */}
              {isUserExpanded && (
                <div className="px-4 pb-5 pt-1 sm:px-5 border-t border-white/[0.06] bg-black/20 space-y-4">
                  {/* Peer Hardware Devices */}
                  <div>
                    <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider block mb-2 font-bold">
                      Connected Peer Hardware:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {user.devices?.map((dev, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getDeviceIcon(dev.os)}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">{dev.name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono block truncate">{dev.ip}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                dev.online ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                              }`}
                              title={dev.online ? 'Online' : 'Offline / Idle'}
                            />
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{dev.os}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Service Access Control (RBAC) */}
                  {!user.is_owner && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider font-bold">
                          Allowed Appliance Services ({userPerms.length} active):
                        </span>
                        {canManageAccess && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const allIds = (data?.available_services || []).map((s) => s.id);
                                setSelectedPerms((prev) => ({ ...prev, [user.login_name]: allIds }));
                              }}
                              className="text-[10px] font-mono text-tinapple-gold hover:underline"
                            >
                              Select All
                            </button>
                            <span className="text-zinc-600">|</span>
                            <button
                              onClick={() => {
                                setSelectedPerms((prev) => ({ ...prev, [user.login_name]: [] }));
                              }}
                              className="text-[10px] font-mono text-zinc-400 hover:text-white"
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {data?.available_services.map((svc) => {
                          const isAllowed = userPerms.includes(svc.id);
                          return (
                            <button
                              key={svc.id}
                              disabled={!canManageAccess || isUpdating}
                              onClick={() => handleToggleService(user.login_name, svc.id)}
                              className={`p-2 rounded-xl text-left border flex items-center justify-between gap-2 transition-all ${
                                isAllowed
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-800/40 border-slate-700/50 text-zinc-400 hover:border-slate-600'
                              } disabled:cursor-default`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span>{svc.icon}</span>
                                <span className="text-xs font-mono font-medium truncate">{svc.name}</span>
                              </div>
                              {isAllowed && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Save Permissions Button */}
                      {canManageAccess && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleSavePermissions(user.login_name)}
                            disabled={isUpdating}
                            className="px-4 py-1.5 rounded-xl bg-tinapple-gold/20 hover:bg-tinapple-gold/30 border border-tinapple-gold/40 text-tinapple-gold font-mono text-xs font-bold transition-all disabled:opacity-50"
                          >
                            Save Permissions for {user.display_name || user.login_name}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TailscaleUserManager;
