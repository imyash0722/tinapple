import React, { useRef, useEffect } from 'react';
import { Cpu, HardDrive, MemoryStick, Activity, ArrowDownRight, ArrowUpRight, Gauge, Layers, Sparkles } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { CountUp } from '../reactbits/CountUp';
import { ShinyText } from '../reactbits/ShinyText';
import { TelemetrySnapshot } from '../../types/api';

interface TelemetryCardsProps {
  telemetry: TelemetrySnapshot;
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

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({ telemetry, history, accentColor, secondaryColor, onOpenTailscale }) => {
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
                <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 shadow-sm shadow-tinapple-gold/10">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold tracking-wider text-tinapple-text uppercase">
                        PROCESSOR MATRIX
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-tinapple-green/10 text-tinapple-green border border-tinapple-green/20 font-mono">
                      x86-64-v4 BORE
                    </span>
                  </div>
                  <p className="text-xs text-tinapple-subtext font-mono truncate max-w-sm mt-0.5">
                    {telemetry.cpu.modelName || 'AMD Ryzen 7 7840HS w/ Radeon 780M'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-xl bg-tinapple-dark/80 text-tinapple-gold border border-tinapple-border font-mono font-semibold">
                  {numCores} Cores
                </span>
              </div>
            </div>

            {/* Metric Stats & Waveform Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end mb-4">
              <div className="sm:col-span-5">
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                  <CountUp to={telemetry.cpu.usagePercent || 0} decimals={2} suffix="%" />
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-tinapple-subtext">
                  <span>Load Avg:</span>
                  <span className="text-tinapple-gold font-semibold">
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
            <div className="pt-4 border-t border-tinapple-border/70">
              <div className="flex justify-between items-center mb-2 text-[11px] font-mono text-tinapple-muted uppercase tracking-wider">
                <span>Logical Core Utilization Matrix (C0 - C{numCores - 1})</span>
                <span className="text-tinapple-green">amd_pstate: active</span>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
                {coreLoads.map((load, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="w-full h-10 rounded-md bg-tinapple-dark/80 border border-tinapple-border/80 p-0.5 flex flex-col justify-end overflow-hidden">
                      <div
                        className="w-full rounded-sm transition-all duration-300"
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
                    <span className="text-[9px] font-mono text-tinapple-muted">
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
                <div className="p-2.5 rounded-2xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/25 shadow-sm shadow-tinapple-green/10">
                  <MemoryStick className="w-5 h-5" />
                </div>
                <div>
                  <div>
                    <span className="text-xs font-mono font-bold tracking-wider text-tinapple-text uppercase">
                      MEMORY MATRIX
                    </span>
                  </div>
                  <p className="text-xs text-tinapple-subtext font-mono">
                    DDR5-5600 Dual Channel
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-xl bg-tinapple-dark/80 text-tinapple-green border border-tinapple-border font-mono font-semibold">
                {formatBytes(telemetry.memory.totalBytes)} Total
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <div>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                  <CountUp to={telemetry.memory.usagePercent} decimals={2} suffix="%" />
                </div>
                <p className="text-xs text-tinapple-subtext font-mono mt-1.5">
                  {formatBytes(telemetry.memory.usedBytes)} Active / {formatBytes(telemetry.memory.freeBytes)} Available
                </p>
              </div>
            </div>

            {/* Multi-layered Memory Pool Track */}
            <div className="space-y-3 mb-4">
              <div className="h-3 w-full rounded-full bg-tinapple-dark/80 border border-tinapple-border overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-tinapple-green to-tinapple-emerald transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.memory.usagePercent * 0.75)}%` }}
                  title="Active Heap & Buffers"
                />
                <div
                  className="h-full bg-tinapple-gold/70 transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.memory.usagePercent * 0.25)}%` }}
                  title="Page Cache"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
                  <span className="text-[10px] text-tinapple-muted block">BUFFERS</span>
                  <span className="text-xs font-semibold text-tinapple-green">
                    {formatBytes(telemetry.memory.usedBytes * 0.4)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
                  <span className="text-[10px] text-tinapple-muted block">CACHED</span>
                  <span className="text-xs font-semibold text-tinapple-gold">
                    {formatBytes(telemetry.memory.usedBytes * 0.6)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
                  <span className="text-[10px] text-tinapple-muted block">ZRAM SWAP</span>
                  <span className="text-xs font-semibold text-tinapple-text">0 B / 8 GB</span>
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

        {/* STORAGE POOLS & BTRFS (6 cols) */}
        <SpotlightCard
          className="lg:col-span-6 p-6"
          spotlightColor="rgb(var(--tinapple-accent-rgb) / 0.12)"
          borderColor="rgb(var(--tinapple-accent-rgb) / 0.35)"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div>
                  <span className="text-xs font-mono font-bold tracking-wider text-tinapple-text uppercase">
                    BTRFS STORAGE
                  </span>
                </div>
                <p className="text-xs text-tinapple-subtext font-mono">
                  {telemetry.disk.mountPoint} • btrfs zstd compression
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-xl bg-tinapple-dark/80 text-tinapple-gold border border-tinapple-border font-mono font-semibold">
              {formatBytes(telemetry.disk.totalBytes)} NVMe Pool
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-3xl font-black text-white tracking-tight font-mono">
                <CountUp to={telemetry.disk.usagePercent} decimals={2} suffix="%" />
              </div>
              <p className="text-xs text-tinapple-subtext font-mono mt-1">
                {formatBytes(telemetry.disk.usedBytes)} Used / {formatBytes(telemetry.disk.freeBytes)} Available
              </p>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-tinapple-dark/80 border border-tinapple-border overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-tinapple-gold to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${telemetry.disk.usagePercent}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
            <div className="p-2 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
              <span className="text-[10px] text-tinapple-muted block">@root</span>
              <span className="text-tinapple-text font-semibold">12.4 GB</span>
            </div>
            <div className="p-2 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
              <span className="text-[10px] text-tinapple-muted block">@home</span>
              <span className="text-tinapple-text font-semibold">48.2 GB</span>
            </div>
            <div className="p-2 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
              <span className="text-[10px] text-tinapple-muted block">@snapshots</span>
              <span className="text-tinapple-gold font-semibold">8.6 GB</span>
            </div>
            <div className="p-2 rounded-xl bg-tinapple-dark/60 border border-tinapple-border">
              <span className="text-[10px] text-tinapple-muted block">@var_log</span>
              <span className="text-tinapple-green font-semibold">1.4 GB</span>
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
              <div className="p-2.5 rounded-2xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/25">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div>
                  <span className="text-xs font-mono font-bold tracking-wider text-tinapple-text uppercase">
                    NETWORK MESH
                  </span>
                </div>
                <p className="text-xs text-tinapple-subtext font-mono">
                  {telemetry.network.interfaces?.join(' • ') || 'tailscale0 • wlan0'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenTailscale && (
                <button
                  onClick={onOpenTailscale}
                  className="text-xs px-2.5 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 font-mono font-semibold transition-colors flex items-center gap-1.5"
                  title="Tailscale remote access & login"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Tailscale Login</span>
                </button>
              )}
              <span className="text-xs px-2.5 py-1 rounded-xl bg-tinapple-dark/80 text-tinapple-green border border-tinapple-border font-mono font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tinapple-green animate-pulse" />
                <span>Direct Mesh</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="p-3 rounded-2xl bg-tinapple-dark/70 border border-tinapple-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-tinapple-green font-mono">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>INBOUND</span>
                </div>
                <div className="text-xl font-extrabold text-white font-mono mt-1">
                  {formatRate(telemetry.network.rateIn)}
                </div>
              </div>
              <span className="text-[10px] font-mono text-tinapple-muted">RX Total: {formatBytes(telemetry.network.bytesReceived)}</span>
            </div>

            <div className="p-3 rounded-2xl bg-tinapple-dark/70 border border-tinapple-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-tinapple-gold font-mono">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>OUTBOUND</span>
                </div>
                <div className="text-xl font-extrabold text-white font-mono mt-1">
                  {formatRate(telemetry.network.rateOut)}
                </div>
              </div>
              <span className="text-[10px] font-mono text-tinapple-muted">TX Total: {formatBytes(telemetry.network.bytesSent)}</span>
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
