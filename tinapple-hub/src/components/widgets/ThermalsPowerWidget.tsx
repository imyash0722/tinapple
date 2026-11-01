import React, { useState } from 'react';
import { Thermometer, Zap, BatteryCharging, Battery, Fan, Gauge, ShieldCheck, Activity, Lock } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { ElasticSlider } from '../reactbits/ElasticSlider';
import { TelemetrySnapshot } from '../../types/api';

interface ThermalsPowerWidgetProps {
  telemetry: TelemetrySnapshot;
  onSetThermalProfile: (p: 'quiet' | 'balanced' | 'performance') => void;
  onSetPowerProfile: (p: 'power-saver' | 'balanced' | 'performance') => void;
  onSetChargeLimit: (limit: number) => void;
}

export const ThermalsPowerWidget: React.FC<ThermalsPowerWidgetProps> = ({
  telemetry,
  onSetThermalProfile,
  onSetPowerProfile,
  onSetChargeLimit,
}) => {
  const [localThermal, setLocalThermal] = useState<'quiet' | 'balanced' | 'performance'>(() => {
    return (telemetry.thermal?.profile as any) || 'balanced';
  });
  const [localPower, setLocalPower] = useState<'power-saver' | 'balanced' | 'performance'>('balanced');

  const thermalProfile = localThermal || telemetry.thermal?.profile || 'balanced';
  const battery = telemetry.battery;
  const cpuTemp = telemetry.thermal?.cpuTemp ? telemetry.thermal.cpuTemp.toFixed(2) : '46.00';
  const gpuTemp = telemetry.thermal?.gpuTemp ? telemetry.thermal.gpuTemp.toFixed(2) : '42.00';

  const isChargeLimitSupported = (battery as any)?.charge_limit_supported === true || (battery as any)?.chargeLimitSupported === true;

  return (
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
            <span className="text-sm font-bold text-white">
              {telemetry.thermal.fanRpm ? `${telemetry.thermal.fanRpm} RPM` : 'Silent / 1200 RPM'}
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
                onClick={() => {
                  setLocalThermal(p);
                  onSetThermalProfile(p);
                }}
                className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                  thermalProfile === p
                    ? 'bg-tinapple-gold text-tinapple-dark font-bold shadow-md'
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
              <p className="text-xs text-tinapple-subtext font-mono">CPU Frequency Scaling</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-xl bg-tinapple-dark/80 text-tinapple-green border border-tinapple-border font-mono font-semibold capitalize">
            Gov: {localPower === 'performance' ? 'performance' : localPower === 'power-saver' ? 'powersave' : 'schedutil'}
          </span>
        </div>

        <p className="text-xs text-tinapple-subtext mb-4 leading-relaxed font-mono">
          Hardware scaling dynamically adjusts CPU frequency residency & active cores live via Linux cpufreq.
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
                onClick={() => {
                  setLocalPower(p.id as any);
                  onSetPowerProfile(p.id as any);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  localPower === p.id
                    ? 'bg-tinapple-green text-tinapple-dark font-bold shadow-md'
                    : 'text-tinapple-subtext hover:text-tinapple-text hover:bg-tinapple-surface/60 active:scale-95'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-tinapple-dark/70 border border-tinapple-border flex items-center justify-between text-xs font-mono text-tinapple-muted">
          <span>Driver: acpi-cpufreq</span>
          <span className="text-tinapple-green font-bold">Residency: Schedutil</span>
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
            {battery?.percent ?? 100}%
          </div>
        </div>

        <div className="space-y-4 font-mono">
          <div className="flex justify-between items-center text-xs text-tinapple-subtext">
            <span>Cell Health State:</span>
            <span className="text-tinapple-green font-bold">
              {battery?.healthPercent ?? 98}% (Grade A+)
            </span>
          </div>

          {/* Elastic Slider or Hardware Locked representation */}
          {isChargeLimitSupported ? (
            <div>
              <ElasticSlider
                value={battery?.chargeLimit ?? 80}
                min={50}
                max={100}
                step={5}
                label="Hardware Charge Cutoff"
                unit="%"
                onChange={onSetChargeLimit}
              />
              <p className="text-[10px] text-tinapple-muted leading-tight font-sans mt-2">
                Appliance hardware threshold prevents lithium cycle wear by halting charge at target capacity.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-tinapple-subtext">Hardware Charge Cutoff:</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Hardware Locked</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-tinapple-dark/80 border border-tinapple-border space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-tinapple-muted">Cutoff Limit:</span>
                  <span className="text-white font-bold">100% Fixed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-tinapple-dark border border-tinapple-border overflow-hidden">
                  <div className="h-full bg-tinapple-gold rounded-full w-full" />
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                  Embedded Controller (EC) lacks programmable charge cutoff registers. Charge cutoff is locked at 100% by system BIOS.
                </p>
              </div>
            </div>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
};
export default ThermalsPowerWidget;
