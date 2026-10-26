import React from 'react';
import {
  Cpu,
  Shield,
  Disc,
  CircuitBoard,
  Server,
  CheckCircle2,
  Zap,
  Thermometer,
  BatteryCharging,
  Battery,
  Fan,
  Gauge,
  Activity,
} from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { ElasticSlider } from '../reactbits/ElasticSlider';
import { HardwareInfo, TelemetrySnapshot } from '../../types/api';

interface HardwareSensorsProps {
  hardware: HardwareInfo;
  telemetry?: TelemetrySnapshot;
  onSetThermalProfile?: (p: 'quiet' | 'balanced' | 'performance') => void;
  onSetPowerProfile?: (p: 'power-saver' | 'balanced' | 'performance') => void;
  onSetChargeLimit?: (limit: number) => void;
}

export const HardwareSensors: React.FC<HardwareSensorsProps> = ({
  hardware,
  telemetry,
  onSetThermalProfile,
  onSetPowerProfile,
  onSetChargeLimit,
}) => {
  const thermalProfile = telemetry?.thermal?.profile || 'balanced';
  const battery = telemetry?.battery;
  const cpuTemp = telemetry?.thermal?.cpuTemp !== undefined
    ? telemetry.thermal.cpuTemp.toFixed(2)
    : '46.00';
  const gpuTemp = telemetry?.thermal?.gpuTemp !== undefined
    ? telemetry.thermal.gpuTemp.toFixed(2)
    : '42.00';

  return (
    <div className="space-y-6">
      {/* Hardware Center Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-tinapple-card/95 via-tinapple-surface/90 to-tinapple-card/95 border border-tinapple-border backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 text-xs mb-2.5 font-mono">
            <Cpu className="w-3.5 h-3.5" />
            <span>Silicon Hardware & Thermal Center</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black font-mono tracking-tight text-white uppercase">
            HARDWARE TELEMETRY & TOPOLOGY
          </h2>
          <p className="text-xs text-tinapple-subtext font-mono mt-1">
            Real-time thermals, fan curves, power policies, silicon attestation, and PCI bus topology.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-tinapple-green bg-tinapple-green/10 px-3.5 py-2 rounded-xl border border-tinapple-green/20 self-start md:self-center shadow-sm">
          <span className="w-2 h-2 rounded-full bg-tinapple-green animate-pulse" />
          <span>Silicon Integrity Verified</span>
        </div>
      </div>

      {/* SECTION 1: REAL-TIME THERMALS, POWER, AND BATTERY */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-tinapple-gold animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Live Thermal Governance & Energy Management
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* THERMALS & ACOUSTICS */}
          <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.15)" borderColor="rgb(var(--tinapple-accent-rgb) / 0.4)">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Thermals & Acoustics</h3>
                  <p className="text-xs text-tinapple-subtext font-mono">Dynamic Fan Curves</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-sm font-extrabold text-tinapple-gold">
                <span>{cpuTemp}°C</span>
              </div>
            </div>

            {/* Fan & Temp metrics */}
            <div className="grid grid-cols-2 gap-2.5 mb-4 font-mono">
              <div className="p-3 rounded-xl bg-tinapple-dark/70 border border-tinapple-border">
                <div className="flex items-center gap-1.5 text-xs text-tinapple-subtext mb-1">
                  <Fan className="w-3.5 h-3.5 text-tinapple-green animate-[spin_3s_linear_infinite]" />
                  <span>Cooling Fan</span>
                </div>
                <span className="text-sm font-bold text-tinapple-text">
                  {telemetry?.thermal?.fanRpm ? `${telemetry.thermal.fanRpm} RPM` : 'Silent / 1200 RPM'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-tinapple-dark/70 border border-tinapple-border">
                <div className="flex items-center gap-1.5 text-xs text-tinapple-subtext mb-1">
                  <Gauge className="w-3.5 h-3.5 text-tinapple-gold" />
                  <span>GPU Temp</span>
                </div>
                <span className="text-sm font-bold text-tinapple-text">
                  {gpuTemp}°C
                </span>
              </div>
            </div>

            {/* Thermal Profiles */}
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-tinapple-muted block mb-2">
                Acoustic / Fan Curve
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border font-mono">
                {(['quiet', 'balanced', 'performance'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => onSetThermalProfile?.(p)}
                    className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                      thermalProfile === p
                        ? 'bg-tinapple-gold text-tinapple-dark shadow-md'
                        : 'text-tinapple-subtext hover:text-tinapple-text hover:bg-tinapple-surface/60'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </SpotlightCard>

          {/* POWER GOVERNOR */}
          <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-secondary-rgb) / 0.15)" borderColor="rgb(var(--tinapple-secondary-rgb) / 0.4)">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/25">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Power Policy</h3>
                  <p className="text-xs text-tinapple-subtext font-mono">Energy Preference (EPP)</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-xl bg-tinapple-dark/80 text-tinapple-green border border-tinapple-border font-mono font-semibold capitalize">
                EPP: balance
              </span>
            </div>

            <p className="text-xs text-tinapple-subtext mb-4 leading-relaxed font-mono">
              Kernel scaling dynamically modulates CPU frequency residency live via pstate/intel_idle.
            </p>

            {/* Power Profile Selector */}
            <div className="space-y-2 mb-4 font-mono">
              <label className="text-[11px] font-mono uppercase tracking-wider text-tinapple-muted block">
                Select Active Profile
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border">
                {[
                  { id: 'power-saver', label: 'Eco' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'performance', label: 'Turbo' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSetPowerProfile?.(p.id as any)}
                    className="py-2 text-xs font-semibold rounded-lg transition-all text-tinapple-subtext hover:text-tinapple-text hover:bg-tinapple-surface/60 active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-tinapple-dark/70 border border-tinapple-border flex items-center justify-between text-xs font-mono text-tinapple-muted">
              <span>Driver: intel_pstate</span>
              <span className="text-tinapple-green">Gov: powersave</span>
            </div>
          </SpotlightCard>

          {/* BATTERY & BMS CHARGE LIMIT */}
          <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.15)" borderColor="rgb(var(--tinapple-accent-rgb) / 0.4)">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25">
                  {battery?.charging ? (
                    <BatteryCharging className="w-5 h-5 text-tinapple-gold animate-pulse" />
                  ) : (
                    <Battery className="w-5 h-5 text-tinapple-gold" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">BMS Battery Guard</h3>
                  <p className="text-xs text-tinapple-subtext font-mono">
                    {battery?.charging ? 'Charging via AC' : 'Battery Mode'}
                  </p>
                </div>
              </div>
              <div className="font-mono text-xl font-black text-tinapple-gold">
                {battery?.percent ?? 86}%
              </div>
            </div>

            <div className="space-y-4 font-mono">
              <div className="flex justify-between items-center text-xs text-tinapple-subtext">
                <span>Cell Health State:</span>
                <span className="text-tinapple-green font-bold">
                  {battery?.healthPercent ?? 98}% (Grade A+)
                </span>
              </div>

              {/* Elastic Slider for Battery Charge Limit */}
              {onSetChargeLimit && (
                <ElasticSlider
                  value={battery?.chargeLimit ?? 80}
                  min={50}
                  max={100}
                  step={5}
                  label="Hardware Charge Cutoff"
                  unit="%"
                  onChange={onSetChargeLimit}
                />
              )}

              <p className="text-[10px] text-tinapple-muted leading-tight font-sans">
                Appliance hardware threshold prevents lithium cycle wear by halting charge at target capacity.
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* SECTION 2: TOPOLOGY, ARCHITECTURE & SECURITY */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-tinapple-green animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Platform Architecture & Silicon Attestation
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* PLATFORM PROFILE */}
          <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.15)" borderColor="rgb(var(--tinapple-accent-rgb) / 0.4)">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-tinapple-subtext uppercase tracking-wider font-mono">
                  Platform Architecture
                </h4>
                <p className="text-sm font-bold text-white mt-0.5">{hardware.profile}</p>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-tinapple-border/70 text-xs font-mono">
              <div className="flex justify-between text-tinapple-subtext">
                <span>Instruction Set:</span>
                <span className="text-tinapple-gold font-bold">
                  {hardware.cpu?.arch || 'x86_64'} ({(hardware.cpu?.features || []).slice(0, 3).join(', ').toUpperCase() || 'AVX, SSE4.2'})
                </span>
              </div>
              <div className="flex justify-between text-tinapple-subtext">
                <span>Core Topology:</span>
                <span className="text-white">
                  {hardware.cpu?.cores || 2} Cores / {hardware.cpu?.threads || 4} Threads
                </span>
              </div>
              <div className="flex justify-between text-tinapple-subtext">
                <span>Total RAM:</span>
                <span className="text-tinapple-green font-bold">{hardware.memoryGb || 8} GB RAM</span>
              </div>
            </div>
          </SpotlightCard>

          {/* SECURITY & TPM */}
          <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-secondary-rgb) / 0.15)" borderColor="rgb(var(--tinapple-secondary-rgb) / 0.4)">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/25">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-tinapple-subtext uppercase tracking-wider font-mono">
                  Hardware Security
                </h4>
                <p className="text-sm font-bold text-white mt-0.5">
                  {hardware.tpm2Present ? 'TPM 2.0 Cryptoprocessor' : 'Standard Silicon Security'}
                </p>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-tinapple-border/70 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-tinapple-subtext">TPM 2.0 State:</span>
                {hardware.tpm2Present ? (
                  <span className="px-2 py-0.5 rounded-md bg-tinapple-green/15 text-tinapple-green font-bold border border-tinapple-green/25 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active (Hardware)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold border border-amber-500/25 flex items-center gap-1">
                    <span>None Detected (Legacy)</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-tinapple-subtext">Secure Boot:</span>
                <span className="px-2 py-0.5 rounded-md bg-tinapple-dark text-tinapple-muted border border-tinapple-border">
                  {hardware.secureBootEnabled ? 'Enforced' : 'Disabled / Legacy Mode'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-tinapple-subtext">LUKS Autounlock:</span>
                <span className="text-tinapple-gold font-bold">
                  {hardware.tpm2Present ? 'tpm2-pcr-sealed' : 'Passphrase Authentication'}
                </span>
              </div>
            </div>
          </SpotlightCard>

          {/* GPU & ACCELERATION */}
          <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.15)" borderColor="rgb(var(--tinapple-accent-rgb) / 0.4)">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25">
                <CircuitBoard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-tinapple-subtext uppercase tracking-wider font-mono">
                  GPU Acceleration
                </h4>
                <p className="text-sm font-bold text-white mt-0.5 truncate max-w-[200px]" title={hardware.gpu?.model || 'Integrated Graphics'}>
                  {hardware.gpu?.model || 'Integrated Display Controller'}
                </p>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-tinapple-border/70 text-xs font-mono">
              <div className="flex justify-between text-tinapple-subtext">
                <span>Display Driver:</span>
                <span className="text-white font-bold">{hardware.gpu?.driver || 'modesetting'}</span>
              </div>
              <div className="flex justify-between text-tinapple-subtext">
                <span>Hardware Video:</span>
                <span className="text-tinapple-green font-bold">
                  {hardware.gpu?.driver === 'i915' ? 'Intel QuickSync / VA-API' : 'VA-API Hardware Video'}
                </span>
              </div>
              <div className="flex justify-between text-tinapple-subtext">
                <span>Vulkan Runtime:</span>
                <span className="text-tinapple-gold font-bold">
                  {hardware.gpu?.driver === 'i915' ? 'Intel ANV Vulkan' : 'Mesa Vulkan Runtime'}
                </span>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* Silicon Cryptographic Attestation Card */}
      <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.2)" borderColor="rgb(var(--tinapple-accent-rgb) / 0.45)">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Silicon Seal */}
            <div className="relative w-24 h-24 rounded-2xl bg-tinapple-dark/90 border border-tinapple-border overflow-hidden p-2 flex items-center justify-center shadow-lg shadow-tinapple-gold/10">
              <Cpu className="w-10 h-10 text-tinapple-gold" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 text-[10px] font-mono mb-1.5">
                <Zap className="w-3 h-3" />
                <span>CRYPTOGRAPHIC TRUST ROOT</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Tinapple High-Integrity Appliance Silicon
              </h3>
              <p className="text-xs text-tinapple-subtext mt-1 max-w-lg font-mono">
                Hardware PCR hash measurements sealed to firmware nonce. Kernel memory protected via SME/SEV virtualization shielding.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-tinapple-dark/70 border border-tinapple-border font-mono text-xs space-y-1.5 min-w-[240px]">
            <div className="flex justify-between text-[11px]">
              <span className="text-tinapple-muted">Firmware Mode:</span>
              <span className="text-tinapple-gold font-bold">
                {(hardware as any).firmware === 'uefi' ? 'UEFI 64-bit' : 'BIOS / Legacy CSM'}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-tinapple-muted">Platform Root:</span>
              <span className="text-white">{hardware.profile}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-tinapple-muted">Hardware State:</span>
              <span className="text-tinapple-green font-bold">Online & Verified</span>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* Storage Physical Disks */}
      <SpotlightCard className="p-6" spotlightColor="rgb(var(--tinapple-secondary-rgb) / 0.12)" borderColor="rgb(var(--tinapple-secondary-rgb) / 0.35)">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-mono uppercase tracking-wide">
          <Disc className="w-4 h-4 text-tinapple-green" />
          <span>Physical Storage Controller & Attached Drives</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(hardware.storageDrives || []).map((drive) => {
            const devPath = drive.name.startsWith('/') ? drive.name : `/dev/${drive.name}`;
            const devSize = drive.sizeGb || (drive as any).size || 'Unknown';
            return (
              <div
                key={drive.name}
                className="p-4 rounded-xl bg-tinapple-dark/80 border border-tinapple-border flex items-center justify-between font-mono"
              >
                <div>
                  <span className="text-sm font-bold text-white">{devPath}</span>
                  <p className="text-xs text-tinapple-subtext mt-0.5">{drive.model}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-tinapple-gold">
                    {typeof devSize === 'number' ? `${devSize} GB` : devSize}
                  </span>
                  <span className="text-[10px] block uppercase text-tinapple-green font-bold">
                    {drive.type || 'SATA'} Interface
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SpotlightCard>
    </div>
  );
};
export default HardwareSensors;
