import React, { useState } from 'react';
import { Settings, Save, Check } from 'lucide-react';
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
      <SpotlightCard className="p-6" spotlightColor="rgba(229, 181, 103, 0.15)" borderColor="rgba(229, 181, 103, 0.45)">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wide font-mono">Appliance Manifest Configuration</h3>
            <p className="text-xs text-tinapple-subtext font-mono">
              Live updates `/etc/tinapple/manifest.yaml` and triggers system re-generation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
          {/* Hostname */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider">System Hostname</label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border border-tinapple-border text-xs text-white focus:outline-none focus:border-tinapple-gold transition-colors"
            />
          </div>

          {/* Linux Kernel */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider">Kernel Architecture</label>
            <select
              value={kernel}
              onChange={(e) => setKernel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border border-tinapple-border text-xs text-white focus:outline-none focus:border-tinapple-gold transition-colors"
            >
              <option value="linux-cachyos">linux-cachyos (BORE Scheduler, x86-64-v4)</option>
              <option value="linux-lts">linux-lts (Kernel 6.6 LTS)</option>
              <option value="linux-zen">linux-zen (Low Latency Desktop)</option>
            </select>
          </div>

          {/* Bootloader */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider">Bootloader Engine</label>
            <select
              value={bootloader}
              onChange={(e) => setBootloader(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-tinapple-dark/90 border border-tinapple-border text-xs text-white focus:outline-none focus:border-tinapple-gold transition-colors"
            >
              <option value="limine">Limine Bootloader (Instant Modern UEFI)</option>
              <option value="grub">GRUB 2.12 (Multi-Boot)</option>
              <option value="systemd-boot">systemd-boot (Simple ESP)</option>
            </select>
          </div>

          {/* Session Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider">Appliance Display Session</label>
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
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-tinapple-border/70">
          <div className="flex items-center justify-between p-4 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
            <div>
              <span className="text-xs font-bold text-white block">
                CachyOS Performance Repositories
              </span>
              <span className="text-[11px] text-tinapple-subtext font-mono">
                Optimized v3/v4 binaries with BORE scheduler.
              </span>
            </div>
            <SquishSwitch checked={enableCachyOS} onChange={setEnableCachyOS} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
            <div>
              <span className="text-xs font-bold text-white block">
                Automated Hardware Tuning
              </span>
              <span className="text-[11px] text-tinapple-subtext font-mono">
                Auto-configures battery limits and acoustic governors.
              </span>
            </div>
            <SquishSwitch checked={enableEaseOfUse} onChange={setEnableEaseOfUse} />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <StarBorder as="button" color="#e5b567" className="w-full md:w-auto">
            <span className="flex items-center gap-2 font-mono font-bold text-white px-4 py-1">
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-tinapple-green" />
                  <span>Manifest Saved & Applied!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-tinapple-gold" />
                  <span>Save & Apply Manifest</span>
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
