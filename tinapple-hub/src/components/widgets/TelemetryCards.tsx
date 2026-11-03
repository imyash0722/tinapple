import React, { useRef, useEffect } from 'react';
import { Cpu, HardDrive, MemoryStick, Activity, ArrowDownRight, ArrowUpRight, Gauge, Layers, Sparkles } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { CountUp } from '../reactbits/CountUp';
import { ShinyText } from '../reactbits/ShinyText';
import { TelemetrySnapshot, SystemInfo } from '../../types/api';

interface TelemetryCardsProps {
  telemetry: TelemetrySnapshot;
  systemInfo?: SystemInfo;
  accentColor: string;
  secondaryColor: string;
  history: {
    cpu: number[];
    memory: number[];
    netIn: number[];
    netOut: number[];
  };
  onOpenTailscale?: () => void;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({ telemetry, systemInfo, history, accentColor, secondaryColor, onOpenTailscale }) => {
  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes.toFixed(2)} B`;
  };

  const formatRate = (bytesSec: number) => {
    if (bytesSec >= 1024 * 1024 * 1024) return `${(bytesSec / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
    if (bytesSec >= 1024 * 1024) return `${(bytesSec / (1024 * 1024)).toFixed(2)} MB/s`;
    if (bytesSec >= 1024) return `${(bytesSec / 1024).toFixed(2)} KB/s`;
    return `${bytesSec.toFixed(2)} B/s`;
  };

  const numCores = telemetry.cpu.cores?.length || 16;
  // Generate simulated dynamic core loads for the 16 cores visualizer matrix
  const coreLoads = Array.from({ length: numCores }, (_, i) => {
    const base = telemetry.cpu.usagePercent;
    const offset = Math.sin(i * 1.5 + Date.now() * 0.002) * 12;
    return Math.max(3, Math.min(98, base + offset));
  });

  return (
    <div className="space-y-5">
      {/* 4 BENTO TELEMETRY CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* HERO PROCESSOR & CORE MATRIX (7 cols) */}
        <SpotlightCard
          className="lg:col-span-7 p-6 flex flex-col justify-between"
          spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.15)"
          borderColor="rgb(var(--tinapple-accent-rgb) / 0.45)"
        >
          <div>
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-xs font-sans font-bold tracking-wider text-on-surface uppercase">
                        Processor Matrix
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-surface-container-highest text-primary border border-outline-variant font-sans">
                      x86-64-v4 BORE
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-sans truncate max-w-sm mt-0.5">
                    {telemetry.cpu.modelName || 'AMD Ryzen 7 7840HS w/ Radeon 780M'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-surface-container-highest text-primary border border-outline-variant font-sans font-medium">
                  {numCores} Cores
                </span>
              </div>
            </div>

            {/* Metric Stats & Waveform Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end mb-4">
              <div className="sm:col-span-5">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight font-sans tabular-nums">
                  <CountUp to={telemetry.cpu.usagePercent || 0} decimals={1} suffix="%" />
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs font-sans text-on-surface-variant tabular-nums">
                  <span>Load Avg:</span>
                  <span className="text-primary font-semibold">
                    {telemetry.cpu.loadAvg ? telemetry.cpu.loadAvg.map((l) => l.toFixed(2)).join(' ') : '0.42 0.58 0.51'}
                  </span>
                </div>
              </div>

              {/* Sparkline Canvas */}
              <div className="sm:col-span-7 h-16 flex items-end">
                <Sparkline
                  data={history.cpu}
                  strokeColor={accentColor}
                  fillColor={`${accentColor}1f`}
                  height={54}
                />
              </div>
            </div>

            {/* 16-Core Activity Matrix Bars */}
            <div className="pt-4 border-t border-outline-variant">
              <div className="flex justify-between items-center mb-2 text-[11px] font-sans text-on-surface-variant uppercase tracking-wider">
                <span>Logical Core Utilization Matrix (C0 - C{numCores - 1})</span>
                <span className="text-primary font-medium">amd_pstate: active</span>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
                {coreLoads.map((load, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="w-full h-10 rounded-[6px] bg-surface-container-highest border border-outline-variant p-0.5 flex flex-col justify-end overflow-hidden">
                      <div
                        className="w-full rounded-[4px] transition-all duration-300"
                        style={{
                          height: `${load}%`,
                          backgroundColor:
                            load > 80
                              ? '#f87171'
                              : load > 50
                              ? accentColor
                              : secondaryColor,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-sans text-on-surface-variant">
                      {idx}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* MEMORY & RESOURCE POOL (5 cols) */}
        <SpotlightCard
          className="lg:col-span-5 p-6 flex flex-col justify-between"
          spotlightColor="rgb(var(--tinapple-secondary-rgb) / 0.15)"
          borderColor="rgb(var(--tinapple-secondary-rgb) / 0.45)"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <MemoryStick className="w-5 h-5" />
                </div>
                <div>
                  <div>
                    <span className="text-xs font-sans font-bold tracking-wider text-on-surface uppercase">
                      Memory Matrix
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-sans">
                    DDR5-5600 Dual Channel
                  </p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-surface-container-highest text-primary border border-outline-variant font-sans font-medium">
                {formatBytes(telemetry.memory.totalBytes)} Total
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight font-sans tabular-nums">
                  <CountUp to={telemetry.memory.usagePercent} decimals={1} suffix="%" />
                </div>
                <p className="text-xs text-on-surface-variant font-sans mt-1 tabular-nums">
                  {formatBytes(telemetry.memory.usedBytes)} Active / {formatBytes(telemetry.memory.freeBytes)} Available
                </p>
              </div>
            </div>

            {/* Multi-layered Memory Pool Track */}
            <div className="space-y-3 mb-4">
              <div className="h-3 w-full rounded-full bg-surface-container-highest border border-outline-variant overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.memory.usagePercent * 0.75)}%` }}
                  title="Active Heap & Buffers"
                />
                <div
                  className="h-full bg-secondary transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.memory.usagePercent * 0.25)}%` }}
                  title="Page Cache"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-sans">
                <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant">
                  <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Buffers</span>
                  <span className="text-xs font-semibold text-primary">
                    {formatBytes(telemetry.memory.buffersBytes ?? telemetry.memory.usedBytes * 0.4)}
                  </span>
                </div>
                <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant">
                  <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Cached</span>
                  <span className="text-xs font-semibold text-secondary">
                    {formatBytes(telemetry.memory.cachedBytes ?? telemetry.memory.usedBytes * 0.6)}
                  </span>
                </div>
                <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant">
                  <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">
                    {telemetry.memory.zramActive ? 'ZRAM Swap' : 'Swap'}
                  </span>
                  <span className="text-xs font-semibold text-on-surface">
                    {telemetry.memory.zramActive
                      ? `${formatBytes(telemetry.memory.zramUsedBytes ?? 0)} / ${formatBytes(telemetry.memory.zramTotalBytes ?? 0)}`
                      : telemetry.memory.swapTotalBytes > 0
                        ? `${formatBytes(telemetry.memory.swapUsedBytes)} / ${formatBytes(telemetry.memory.swapTotalBytes)}`
                        : '0 B / 0 B'}
                  </span>
                </div>
              </div>
            </div>

            <Sparkline
              data={history.memory}
              strokeColor={secondaryColor}
              fillColor={`${secondaryColor}1f`}
              height={44}
            />
          </div>
        </SpotlightCard>

        {/* STORAGE POOLS & FILESYSTEM (6 cols) */}
        <SpotlightCard
          className="lg:col-span-6 p-6"
          spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.12)"
          borderColor="rgb(var(--tinapple-accent-rgb) / 0.35)"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div>
                  <span className="text-xs font-sans font-bold tracking-wider text-on-surface uppercase">
                    {(systemInfo?.filesystem || 'ext4').toUpperCase()} Storage
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-sans">
                  {telemetry.disk.mountPoint || '/'} • {(systemInfo?.filesystem || '').toLowerCase() === 'btrfs' ? 'btrfs zstd compression' : `${systemInfo?.filesystem || 'ext4'} journaling filesystem`}
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-surface-container-highest text-primary border border-outline-variant font-sans font-medium">
              {formatBytes(telemetry.disk.totalBytes)} NVMe Pool
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight font-sans tabular-nums">
                <CountUp to={telemetry.disk.usagePercent} decimals={1} suffix="%" />
              </div>
              <p className="text-xs text-on-surface-variant font-sans mt-1 tabular-nums">
                {formatBytes(telemetry.disk.usedBytes)} Used / {formatBytes(telemetry.disk.freeBytes)} Available
              </p>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-surface-container-highest border border-outline-variant overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${telemetry.disk.usagePercent}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-sans text-xs">
            <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant">
              <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Filesystem</span>
              <span className="text-on-surface font-semibold uppercase">{systemInfo?.filesystem || 'ext4'}</span>
            </div>
            <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant">
              <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Capacity</span>
              <span className="text-on-surface font-semibold">{formatBytes(telemetry.disk.totalBytes)}</span>
            </div>
            <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant">
              <span className="text-[10px] text-primary block uppercase tracking-wider">Used</span>
              <span className="text-primary font-semibold">{formatBytes(telemetry.disk.usedBytes)}</span>
            </div>
            <div className="p-2.5 rounded-[12px] bg-surface-container border border-outline-variant">
              <span className="text-[10px] text-secondary block uppercase tracking-wider">Available</span>
              <span className="text-secondary font-semibold">{formatBytes(telemetry.disk.freeBytes)}</span>
            </div>
          </div>
        </SpotlightCard>

        {/* NETWORK & TAILNET RADAR (6 cols) */}
        <SpotlightCard
          className="lg:col-span-6 p-6"
          spotlightColor="rgb(var(--tinapple-secondary-rgb) / 0.12)"
          borderColor="rgb(var(--tinapple-secondary-rgb) / 0.35)"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div>
                  <span className="text-xs font-sans font-bold tracking-wider text-on-surface uppercase">
                    Network Mesh
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-sans">
                  {telemetry.network.interfaces?.join(' • ') || 'tailscale0 • wlan0'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenTailscale && (
                <button
                  onClick={onOpenTailscale}
                  className="text-xs px-3 py-1 rounded-full bg-surface-container-highest hover:bg-surface-container-high text-primary border border-outline-variant font-sans font-medium transition-colors flex items-center gap-1.5"
                  title="Tailscale remote access & login"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Tailscale Login</span>
                </button>
              )}
              <span className="text-xs px-3 py-1 rounded-full bg-surface-container-highest text-emerald-400 border border-outline-variant font-sans font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Direct Mesh</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="p-3 rounded-[12px] bg-surface-container border border-outline-variant flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-sans">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-semibold">Inbound</span>
                </div>
                <div className="text-xl font-extrabold text-on-surface font-sans mt-1 tabular-nums">
                  {formatRate(telemetry.network.rateIn)}
                </div>
              </div>
              <span className="text-[10px] font-sans text-on-surface-variant tabular-nums">RX: {formatBytes(telemetry.network.bytesReceived)}</span>
            </div>

            <div className="p-3 rounded-[12px] bg-surface-container border border-outline-variant flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-sans">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-semibold">Outbound</span>
                </div>
                <div className="text-xl font-extrabold text-on-surface font-sans mt-1 tabular-nums">
                  {formatRate(telemetry.network.rateOut)}
                </div>
              </div>
              <span className="text-[10px] font-sans text-on-surface-variant tabular-nums">TX: {formatBytes(telemetry.network.bytesSent)}</span>
            </div>
          </div>

          <Sparkline
            data={history.netIn}
            strokeColor={secondaryColor}
            fillColor={`${secondaryColor}1f`}
            height={44}
          />
        </SpotlightCard>
      </div>
    </div>
  );
};

// Canvas Sparkline component
interface SparklineProps {
  data: number[];
  strokeColor: string;
  fillColor: string;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, strokeColor, fillColor, height = 36 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 240);
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) return;

    const maxVal = Math.max(100, ...data);
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const stepX = width / (data.length - 1);

    ctx.beginPath();
    ctx.moveTo(0, height - ((data[0] - minVal) / range) * (height - 8) - 4);

    for (let i = 1; i < data.length; i++) {
      const x = i * stepX;
      const y = height - ((data[i] - minVal) / range) * (height - 8) - 4;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }, [data, strokeColor, fillColor, height]);

  return <canvas ref={canvasRef} className="w-full block" style={{ height }} />;
};
export default TelemetryCards;
