import React, { useState } from 'react';
import { Settings, Save, Check, RotateCcw, Server, Shield, Monitor } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { SquishSwitch } from '../reactbits/SquishSwitch';
import { StarBorder } from '../reactbits/StarBorder';
import { SystemInfo, SessionMode } from '../../types/api';

interface SettingsManifestProps {
  systemInfo: SystemInfo;
  onUpdateSession: (mode: SessionMode) => Promise<void>;
}

export const SettingsManifest: React.FC<SettingsManifestProps> = ({
  systemInfo,
  onUpdateSession,
}) => {
  const [hostname, setHostname] = useState<string>(systemInfo.hostname);
  const [kernel, setKernel] = useState<string>('linux-cachyos');
  const [bootloader, setBootloader] = useState<string>('limine');
  const [enableCachyOS, setEnableCachyOS] = useState<boolean>(true);
  const [enableEaseOfUse, setEnableEaseOfUse] = useState<boolean>(true);
  const [sessionMode, setSessionMode] = useState<SessionMode>(systemInfo.sessionMode);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSession(sessionMode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SpotlightCard className="p-6" spotlightColor="rgba(122, 162, 247, 0.15)">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-tinapple-blue/15 text-tinapple-blue border border-tinapple-blue/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Appliance System Configuration</h3>
            <p className="text-xs text-tinapple-subtext">
              Directly updates `/etc/tinapple/manifest.yaml` and applies system changes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Hostname */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tinapple-text">System Hostname</label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-tinapple-dark/70 border border-tinapple-border text-xs font-mono text-tinapple-text focus:outline-none focus:border-tinapple-blue transition-colors"
            />
          </div>

          {/* Linux Kernel */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tinapple-text">Linux Kernel Flavour</label>
            <select
              value={kernel}
              onChange={(e) => setKernel(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-tinapple-dark/70 border border-tinapple-border text-xs font-mono text-tinapple-text focus:outline-none focus:border-tinapple-blue transition-colors"
            >
              <option value="linux-cachyos">linux-cachyos (Optimized x86-64-v3/v4 scheduler)</option>
              <option value="linux-lts">linux-lts (Long Term Stable 6.6.x)</option>
              <option value="linux-zen">linux-zen (Low Latency Desktop)</option>
            </select>
          </div>

          {/* Bootloader */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tinapple-text">UEFI / BIOS Bootloader</label>
            <select
              value={bootloader}
              onChange={(e) => setBootloader(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-tinapple-dark/70 border border-tinapple-border text-xs font-mono text-tinapple-text focus:outline-none focus:border-tinapple-blue transition-colors"
            >
              <option value="limine">Limine Bootloader (Instant Modern UEFI)</option>
              <option value="grub">GRUB 2.12 (Multi-boot)</option>
              <option value="systemd-boot">systemd-boot (Native ESP)</option>
            </select>
          </div>

          {/* Session Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tinapple-text">Appliance Display Session</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-tinapple-dark/70 border border-tinapple-border">
              {(['headless', 'interactive', 'kiosk'] as SessionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSessionMode(mode)}
                  className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                    sessionMode === mode
                      ? 'bg-tinapple-blue text-tinapple-dark font-semibold shadow-sm'
                      : 'text-tinapple-subtext hover:text-tinapple-text'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-tinapple-border/60">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-tinapple-dark/50 border border-tinapple-border">
            <div>
              <span className="text-xs font-semibold text-tinapple-text block">
                CachyOS High-Performance Repositories
              </span>
              <span className="text-[11px] text-tinapple-subtext">
                Enables BORE scheduler and CPU-specific architecture packages.
              </span>
            </div>
            <SquishSwitch checked={enableCachyOS} onChange={setEnableCachyOS} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-tinapple-dark/50 border border-tinapple-border">
            <div>
              <span className="text-xs font-semibold text-tinapple-text block">
                Ease-of-Use & Automated Hardware Tuning
              </span>
              <span className="text-[11px] text-tinapple-subtext">
                Autodetects battery thresholds and adjusts audio/wifi sleep hooks.
              </span>
            </div>
            <SquishSwitch checked={enableEaseOfUse} onChange={setEnableEaseOfUse} />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <StarBorder as="button" color="#7aa2f7" className="w-full md:w-auto">
            <span className="flex items-center gap-2 font-semibold text-white px-3">
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-tinapple-green" />
                  <span>Manifest Applied & Synced!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-tinapple-cyan" />
                  <span>Save & Apply Configuration</span>
                </>
              )}
            </span>
          </StarBorder>
        </div>
      </SpotlightCard>
    </form>
  );
};
export default SettingsManifest;
