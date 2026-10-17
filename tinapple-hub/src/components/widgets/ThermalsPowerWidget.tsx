import React from 'react';
import { Thermometer, Zap, BatteryCharging, Battery, Fan, Gauge } from 'lucide-react';
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
  const thermalProfile = telemetry.thermal?.profile || 'balanced';
  const battery = telemetry.battery;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* THERMALS & FANS */}
      <SpotlightCard className="p-5" spotlightColor="rgba(255, 158, 100, 0.15)">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-tinapple-orange/15 text-tinapple-orange border border-tinapple-orange/20">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tinapple-text">Thermals & Acoustics</h3>
              <p className="text-[11px] text-tinapple-subtext">Active Governor</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-tinapple-orange">
            <span>{telemetry.thermal?.cpuTemp ? telemetry.thermal.cpuTemp.toFixed(1) : '46.0'}°C</span>
          </div>
        </div>

        {/* Fan & Temp metrics */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
            <div className="flex items-center gap-1 text-[11px] text-tinapple-subtext mb-1">
              <Fan className="w-3.5 h-3.5 text-tinapple-cyan animate-[spin_3s_linear_infinite]" />
              <span>Cooling Fan</span>
            </div>
            <span className="font-mono text-sm font-semibold text-tinapple-text">
              {telemetry.thermal.fanRpm ? `${telemetry.thermal.fanRpm} RPM` : 'Silent / 0 RPM'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
            <div className="flex items-center gap-1 text-[11px] text-tinapple-subtext mb-1">
              <Gauge className="w-3.5 h-3.5 text-tinapple-yellow" />
              <span>GPU Temp</span>
            </div>
            <span className="font-mono text-sm font-semibold text-tinapple-text">
              {telemetry.thermal.gpuTemp ? `${telemetry.thermal.gpuTemp.toFixed(1)}°C` : '40.0°C'}
            </span>
          </div>
        </div>

        {/* Thermal Profiles */}
        <div>
          <label className="text-[11px] font-medium text-tinapple-subtext block mb-2">
            Acoustic / Fan Curve
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-tinapple-dark/80 border border-tinapple-border">
            {(['quiet', 'balanced', 'performance'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onSetThermalProfile(p)}
                className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                  thermalProfile === p
                    ? 'bg-tinapple-orange text-tinapple-dark font-semibold shadow-md'
                    : 'text-tinapple-subtext hover:text-tinapple-text'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </SpotlightCard>

      {/* POWER PROFILES */}
      <SpotlightCard className="p-5" spotlightColor="rgba(122, 162, 247, 0.15)">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-tinapple-blue/15 text-tinapple-blue border border-tinapple-blue/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tinapple-text">Power Governor</h3>
              <p className="text-[11px] text-tinapple-subtext">CPU Energy Policy</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-tinapple-blue/10 text-tinapple-blue border border-tinapple-blue/20 font-mono capitalize">
            EPP: active
          </span>
        </div>

        <p className="text-xs text-tinapple-subtext mb-4 leading-relaxed">
          Tuning hardware frequency scaling and C-state residency directly on the kernel hardware governor.
        </p>

        {/* Power Profile Selector */}
        <div className="space-y-2 mb-4">
          <label className="text-[11px] font-medium text-tinapple-subtext block">
            Select Active Profile
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-tinapple-dark/80 border border-tinapple-border">
            {[
              { id: 'power-saver', label: 'Eco' },
              { id: 'balanced', label: 'Balanced' },
              { id: 'performance', label: 'Turbo' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onSetPowerProfile(p.id as any)}
                className="py-1.5 text-xs font-medium rounded-lg transition-all text-tinapple-subtext hover:text-tinapple-text hover:bg-tinapple-surface/60"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-tinapple-dark/60 border border-tinapple-border flex items-center justify-between text-xs font-mono text-tinapple-muted">
          <span>Driver: amd_pstate_epp</span>
          <span>EPP: balance_performance</span>
        </div>
      </SpotlightCard>

      {/* BATTERY & CHARGE LIMIT */}
      <SpotlightCard className="p-5" spotlightColor="rgba(115, 218, 202, 0.15)">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/20">
              {battery?.charging ? (
                <BatteryCharging className="w-5 h-5 animate-pulse" />
              ) : (
                <Battery className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tinapple-text">Battery Health</h3>
              <p className="text-[11px] text-tinapple-subtext font-mono">
                {battery?.charging ? 'Charging AC' : 'Battery Active'}
              </p>
            </div>
          </div>
          <div className="font-mono text-lg font-extrabold text-tinapple-green">
            {battery?.percent ?? 85}%
          </div>
        </div>

        {/* Battery Health & threshold */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-mono text-tinapple-subtext">
            <span>Health State:</span>
            <span className="text-tinapple-green font-semibold">
              {battery?.healthPercent ?? 98}% (Optimal)
            </span>
          </div>

          {/* Elastic Slider for Battery Charge Limit */}
          <ElasticSlider
            value={battery?.chargeLimit ?? 80}
            min={50}
            max={100}
            step={5}
            label="BMS Hardware Charge Threshold"
            unit="%"
            onChange={onSetChargeLimit}
          />

          <p className="text-[10px] text-tinapple-muted leading-tight">
            Limits battery charging to extend cell cycle life when serving as an appliance or homelab station.
          </p>
        </div>
      </SpotlightCard>
    </div>
  );
};
export default ThermalsPowerWidget;
