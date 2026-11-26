import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Globe,
  Info,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
  Wifi,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { NetworkRouteMode, NetworkerStatus, NetworkerTarget, ProtonProfileMeta } from '../../types/api';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { SquishSwitch } from '../reactbits/SquishSwitch';

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  NL: 'Netherlands',
  JP: 'Japan',
  CH: 'Switzerland',
  RO: 'Romania',
  PL: 'Poland',
  CA: 'Canada',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  NO: 'Norway',
  SG: 'Singapore',
};

function formatCountryLabel(country?: string, code?: string): string {
  const c = (country || '').trim();
  const cc = (code || '').trim().toUpperCase();
  if (c && cc && c.toUpperCase() !== cc) return `${c} (${cc})`;
  if (c && COUNTRY_NAMES[c.toUpperCase()]) return `${COUNTRY_NAMES[c.toUpperCase()]} (${c.toUpperCase()})`;
  if (c) return c;
  if (cc && COUNTRY_NAMES[cc]) return `${COUNTRY_NAMES[cc]} (${cc})`;
  if (cc) return cc;
  return 'Unknown Country';
}

function renderTargetIcon(target: NetworkerTarget) {
  if (target.id === 'hotspot') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
        <Wifi className="w-5 h-5" />
      </div>
    );
  }
  if (target.id === 'exit_node') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
        <Globe className="w-5 h-5" />
      </div>
    );
  }
  return <AppBrandIcon id={target.id} size={40} showBadge />;
}

function modeBadgeStyle(mode: NetworkRouteMode): { label: string; className: string } {
  switch (mode) {
    case 'protonvpn':
      return {
        label: 'ProtonVPN',
        className: 'bg-[#6d4aff]/20 text-[#b7a5ff] border-[#6d4aff]/40',
      };
    case 'tor':
      return {
        label: 'Tor Proxy',
        className: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
    default:
      return {
        label: 'Direct Network',
        className: 'bg-surface-container-highest text-on-surface-variant border-outline-variant',
      };
  }
}

export const NetworkerPage: React.FC = () => {
  const [status, setStatus] = useState<NetworkerStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // WireGuard dropdown & upload modal state
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadConfigText, setUploadConfigText] = useState<string>('');
  const [connectOnUpload, setConnectOnUpload] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadStatus = useCallback(async (refresh = false) => {
    try {
      const next = await api.getNetworkerStatus(refresh);
      setStatus(next);
      setErrorBanner(next.error || null);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to reach tinapple-networker harness');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus(false);
    const timer = window.setInterval(() => {
      loadStatus(false);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadStatus]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const runAction = async (key: string, fn: () => Promise<NetworkerStatus>) => {
    setBusyKey(key);
    setErrorBanner(null);
    try {
      const updated = await fn();
      setStatus(updated);
      if (updated.error) setErrorBanner(updated.error);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Operation failed');
    } finally {
      setBusyKey(null);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadConfigText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadConfigText.trim()) {
      setErrorBanner('Paste or choose a valid ProtonVPN WireGuard .conf file before uploading.');
      return;
    }
    const cleanName = (uploadFileName || 'proton-custom.conf').trim();
    setBusyKey('proton-upload');
    setErrorBanner(null);
    try {
      const updated = await api.uploadNetworkerProtonConfig(cleanName, uploadConfigText, connectOnUpload);
      setStatus(updated);
      setUploadOpen(false);
      setUploadFileName('');
      setUploadConfigText('');
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to upload WireGuard configuration');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRouteToggle = (target: NetworkerTarget, tunnel: 'protonvpn' | 'tor', nextChecked: boolean) => {
    const desiredMode: NetworkRouteMode = nextChecked ? tunnel : 'direct';
    runAction(`route:${target.id}`, () => api.setNetworkerRoute(target.id, desiredMode));
  };

  const proton = status?.proton;
  const tor = status?.tor;
  const profiles: ProtonProfileMeta[] = proton?.profiles || [];
  const activeProfile = profiles.find((p) => p.id === proton?.activeProfileId) || profiles[0];
  const targets: NetworkerTarget[] = status?.targets || [];
  const activeProtonCount = targets.filter((t) => t.mode === 'protonvpn').length;
  const activeTorCount = targets.filter((t) => t.mode === 'tor').length;

  return (
    <div className="space-y-5 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            ProtonVPN & Tor Split-Tunneling
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Kernel policy routing orchestrated by tinapple-networker. Only one tunnel can own a target at a time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => runAction('refresh-all', () => api.getNetworkerStatus(true))}
          disabled={busyKey !== null}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant text-xs font-semibold text-on-surface transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-primary ${busyKey === 'refresh-all' ? 'animate-spin' : ''}`} />
          <span>Refresh Live IPs</span>
        </button>
      </div>

      {/* Error & Harness Warning Banners */}
      {errorBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/35 text-rose-200 text-xs sm:text-sm"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 break-words">{errorBanner}</div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-300 hover:text-white p-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {status?.warnings && status.warnings.length > 0 && (
        <div className="space-y-2">
          {status.warnings.map((w, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Master Tunnel Tiles: Icon (left), Name (left), Reload (right), Toggle (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ProtonVPN Master Tile */}
        <SpotlightCard className="rounded-[24px] border border-outline-variant p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            {/* Left-aligned Icon + Name */}
            <div className="flex items-center gap-3 min-w-0">
              <AppBrandIcon id="protonvpn" size={42} showBadge />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-on-surface truncate">ProtonVPN</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      proton?.active ? 'bg-emerald-400' : 'bg-outline-variant'
                    }`}
                  />
                </div>
                <p className="text-xs text-on-surface-variant truncate tabular-nums">
                  {proton?.active
                    ? `${proton.exitIp || 'Connected'}${proton.countryCode ? ` · ${proton.countryCode}` : ''}`
                    : proton?.configured
                    ? 'Tunnel stopped'
                    : 'No WireGuard config active'}
                </p>
              </div>
            </div>

            {/* Right-aligned Reload + Toggle */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => runAction('proton-reload', () => api.reloadNetworkerProton())}
                disabled={busyKey !== null || !proton?.configured}
                title="Reload WireGuard tunnel & probe exit IP"
                aria-label="Reload ProtonVPN tunnel"
                className="w-9 h-9 rounded-full bg-surface-container-highest hover:bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${busyKey === 'proton-reload' ? 'animate-spin' : ''}`} />
              </button>
              <SquishSwitch
                checked={Boolean(proton?.active)}
                disabled={busyKey !== null}
                label="Toggle ProtonVPN tunnel"
                onChange={(checked) => runAction('proton-toggle', () => api.toggleNetworkerProton(checked))}
              />
            </div>
          </div>
        </SpotlightCard>

        {/* Tor Proxy Master Tile */}
        <SpotlightCard className="rounded-[24px] border border-outline-variant p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            {/* Left-aligned Icon + Name */}
            <div className="flex items-center gap-3 min-w-0">
              <AppBrandIcon id="tor" size={42} showBadge />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-on-surface truncate">Tor Proxy</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      tor?.active ? 'bg-emerald-400' : 'bg-outline-variant'
                    }`}
                  />
                </div>
                <p className="text-xs text-on-surface-variant truncate tabular-nums">
                  {tor?.active
                    ? `${tor.exitIp || 'Circuit ready'}${tor.country ? ` · ${tor.country}` : ''}`
                    : 'Transparent proxy offline'}
                </p>
              </div>
            </div>

            {/* Right-aligned Reload (SIGNAL NEWNYM) + Toggle */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => runAction('tor-reload', () => api.reloadNetworkerTor())}
                disabled={busyKey !== null || !tor?.active}
                title="Request fresh Tor exit circuit (NEWNYM)"
                aria-label="Reload Tor circuit"
                className="w-9 h-9 rounded-full bg-surface-container-highest hover:bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-purple-400 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${busyKey === 'tor-reload' ? 'animate-spin' : ''}`} />
              </button>
              <SquishSwitch
                checked={Boolean(tor?.active)}
                disabled={busyKey !== null}
                label="Toggle Tor Proxy"
                onChange={(checked) => runAction('tor-toggle', () => api.toggleNetworkerTor(checked))}
              />
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Config Selector Tile (ProtonVPN Dropdown + "+ Add more") followed by Tor Country Tile */}
      <div className="space-y-3">
        {/* ProtonVPN WireGuard Config Dropdown Tile */}
        <div ref={dropdownRef} className="relative z-20">
          <div className="rounded-[24px] bg-surface-container-low border border-outline-variant p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AppBrandIcon id="wireguard" size={38} showBadge />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-on-surface">ProtonVPN WireGuard Config</div>
                  <div className="text-xs text-on-surface-variant truncate tabular-nums">
                    {activeProfile
                      ? `${formatCountryLabel(activeProfile.country, activeProfile.countryCode)} · ${activeProfile.endpoint}`
                      : 'Select or upload a WireGuard .conf file'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                disabled={busyKey !== null}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-highest border border-outline-variant text-left min-w-[240px] max-w-full transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-on-surface truncate">
                    {activeProfile ? activeProfile.serverLabel || activeProfile.name : 'Choose profile...'}
                  </div>
                  <div className="text-[11px] text-on-surface-variant truncate">
                    {activeProfile
                      ? `${formatCountryLabel(activeProfile.country, activeProfile.countryCode)}${
                          activeProfile.freeTier ? ' · Free Tier' : ' · Plus/P2P'
                        }`
                      : 'No config selected'}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-full sm:w-[360px] rounded-2xl border border-outline-variant shadow-2xl overflow-hidden z-40"
              style={{ backgroundColor: '#101828' }}
            >
              <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/40">
                {profiles.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-on-surface-variant">No WireGuard configs saved yet.</div>
                ) : (
                  profiles.map((profile) => {
                    const isSelected = profile.id === activeProfile?.id;
                    return (
                      <div
                        key={profile.id}
                        className={`flex items-center justify-between gap-2 px-4 py-2.5 transition-colors ${
                          isSelected ? 'bg-primary/15' : 'hover:bg-surface-container-highest'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            if (!isSelected) {
                              runAction(`select:${profile.id}`, () => api.selectNetworkerProtonProfile(profile.id));
                            }
                          }}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface truncate">{profile.name}</span>
                            {profile.freeTier && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium shrink-0">
                                Free
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-on-surface-variant truncate tabular-nums">
                            {formatCountryLabel(profile.country, profile.countryCode)} · {profile.endpointHost}
                          </div>
                        </button>
                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => runAction(`del:${profile.id}`, () => api.deleteNetworkerProtonProfile(profile.id))}
                            title="Delete config"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom "+ Add more" option */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setUploadOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-primary/15 border-t border-outline-variant text-primary text-xs font-bold transition-colors"
                style={{ backgroundColor: '#0c121f' }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Add more</span>
              </button>
            </div>
          )}
        </div>

        {/* Tor Output Country Tile (Directly Below Proton Config Dropdown) */}
        <div className="rounded-[24px] bg-surface-container-low border border-outline-variant p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AppBrandIcon id="tor" size={38} showBadge />
              <div className="min-w-0">
                <div className="text-sm font-bold text-on-surface">Tor Connected Exit Country</div>
                <div className="text-xs text-on-surface-variant truncate">
                  {tor?.active
                    ? 'Automatic Tor onion exit relay geolocation'
                    : 'Enable Tor Proxy above to inspect exit country'}
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-surface-container border border-outline-variant min-w-[240px]">
              {tor?.active ? (
                <div>
                  <div className="text-xs font-bold text-on-surface truncate">
                    {formatCountryLabel(tor.country, tor.countryCode)}
                  </div>
                  <div className="text-[11px] text-on-surface-variant truncate tabular-nums">
                    {[tor.city, tor.exitIp].filter(Boolean).join(' · ') || 'Resolving exit relay...'}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-on-surface-variant">Tor proxy is disconnected</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Per-Service Mutual-Exclusion Split-Tunneling List */}
      <SpotlightCard className="rounded-[26px] border border-outline-variant p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-outline-variant/60">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
              Per-Service Split Tunneling
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Hotspot and Exit Node sit at the top. Each row routes exclusively via ProtonVPN, Tor Proxy, or Direct Network.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-[#6d4aff]/15 text-[#b7a5ff] border border-[#6d4aff]/30">
              {activeProtonCount} ProtonVPN
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {activeTorCount} Tor
            </span>
          </div>
        </div>

        {loading && targets.length === 0 ? (
          <div className="py-12 text-center text-xs text-on-surface-variant">Loading kernel routing targets...</div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {targets.map((target, index) => {
              const badge = modeBadgeStyle(target.mode);
              const isBusy = busyKey === `route:${target.id}`;
              const isSpecialTop = target.id === 'hotspot' || target.id === 'exit_node';
              const showP2pNotice = target.p2pRisk && (target.p2pWarningActive || proton?.freeTier !== false);

              return (
                <div
                  key={target.id}
                  className={`py-3.5 sm:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                    index === 1 ? 'border-b-2 border-outline-variant' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {renderTargetIcon(target)}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">{target.name}</span>
                        {isSpecialTop && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold">
                            {target.id === 'hotspot' ? 'AP Gateway' : 'Tailscale Ingress'}
                          </span>
                        )}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface-variant">{target.subtitle}</p>

                      {target.extraNote && (
                        <div className="inline-flex items-start gap-1.5 text-[11px] text-sky-300/90 bg-sky-500/10 border border-sky-500/25 rounded-xl px-2.5 py-1.5 mt-1">
                          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <span>{target.extraNote}</span>
                        </div>
                      )}

                      {showP2pNotice && (
                        <div
                          className={`inline-flex items-start gap-1.5 text-[11px] rounded-xl px-2.5 py-1.5 mt-1 border ${
                            target.p2pWarningActive
                              ? 'text-amber-200 bg-amber-500/15 border-amber-500/45 font-medium'
                              : 'text-amber-300/80 bg-amber-500/5 border-amber-500/20'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            {target.id === 'exit_node'
                              ? 'Exit node ProtonVPN on the free plan does not support P2P connections and will block torrenting.'
                              : target.p2pWarning || 'ProtonVPN does not support P2P connections in the free tier.'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mutually Exclusive Controls: ProtonVPN toggle + Tor toggle */}
                  <div className="flex items-center gap-4 sm:gap-5 self-end md:self-center shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface-variant">ProtonVPN</span>
                      <SquishSwitch
                        checked={target.mode === 'protonvpn'}
                        disabled={busyKey !== null || isBusy}
                        label={`Route ${target.name} through ProtonVPN`}
                        onChange={(checked) => handleRouteToggle(target, 'protonvpn', checked)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface-variant">Tor</span>
                      <SquishSwitch
                        checked={target.mode === 'tor'}
                        disabled={busyKey !== null || isBusy}
                        label={`Route ${target.name} through Tor Proxy`}
                        onChange={(checked) => handleRouteToggle(target, 'tor', checked)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SpotlightCard>

      {/* "+ Add more" WireGuard Config Upload Dialog */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[26px] bg-surface-container-low border border-outline-variant p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AppBrandIcon id="wireguard" size={28} />
                <h3 className="text-base font-bold text-on-surface">Add ProtonVPN WireGuard Config</h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-container-highest text-on-surface-variant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".conf,.txt"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-primary/50 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadFileName ? `Selected: ${uploadFileName}` : 'Choose .conf file (e.g. tinapple-US-FREE-15.conf)'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Config filename
                </label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="tinapple-US-FREE-15.conf"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  WireGuard .conf contents
                </label>
                <textarea
                  rows={7}
                  value={uploadConfigText}
                  onChange={(e) => setUploadConfigText(e.target.value)}
                  placeholder={'[Interface]\nPrivateKey = ...\nAddress = 10.2.0.2/32\n\n[Peer]\nPublicKey = ...\nEndpoint = x.x.x.x:51820'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 text-xs text-on-surface font-medium cursor-pointer">
                  <SquishSwitch
                    checked={connectOnUpload}
                    onChange={setConnectOnUpload}
                    label="Activate config immediately"
                  />
                  <span>Activate config immediately</span>
                </label>

                <button
                  type="submit"
                  disabled={busyKey === 'proton-upload'}
                  className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {busyKey === 'proton-upload' ? 'Uploading...' : 'Save & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkerPage;
