import React, { useRef, useEffect } from 'react';
import { Cpu, HardDrive, MemoryStick, Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { CountUp } from '../reactbits/CountUp';
import { TelemetrySnapshot } from '../../types/api';

interface TelemetryCardsProps {
  telemetry: TelemetrySnapshot;
  history: {
    cpu: number[];
    memory: number[];
    netIn: number[];
    netOut: number[];
  };
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({ telemetry, history }) => {
  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const formatRate = (bytesSec: number) => {
    if (bytesSec >= 1024 * 1024) return `${(bytesSec / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bytesSec >= 1024) return `${(bytesSec / 1024).toFixed(0)} KB/s`;
    return `${bytesSec} B/s`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU CARD */}
      <SpotlightCard
        className="p-5"
        spotlightColor="rgba(122, 162, 247, 0.18)"
        borderColor="rgba(122, 162, 247, 0.5)"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-tinapple-blue/15 text-tinapple-blue border border-tinapple-blue/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tinapple-text">Processor</h3>
              <p className="text-[11px] text-tinapple-subtext font-mono truncate max-w-[140px]">
                {telemetry.cpu.modelName || 'System CPU'}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-tinapple-blue/10 text-tinapple-blue border border-tinapple-blue/20 font-mono">
            {telemetry.cpu.cores?.length || 8} Cores
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            <CountUp to={telemetry.cpu.usagePercent || 0} decimals={1} suffix="%" />
          </div>
          <span className="text-xs text-tinapple-subtext font-mono">
            Load: {telemetry.cpu.loadAvg ? telemetry.cpu.loadAvg.map((l) => l.toFixed(2)).join(', ') : '0.42, 0.58, 0.51'}
          </span>
        </div>

        {/* Mini Sparkline Canvas */}
        <Sparkline data={history.cpu} strokeColor="#7aa2f7" fillColor="rgba(122, 162, 247, 0.15)" />
      </SpotlightCard>

      {/* MEMORY CARD */}
      <SpotlightCard
        className="p-5"
        spotlightColor="rgba(187, 154, 247, 0.18)"
        borderColor="rgba(187, 154, 247, 0.5)"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-tinapple-purple/15 text-tinapple-purple border border-tinapple-purple/20">
              <MemoryStick className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tinapple-text">Memory</h3>
              <p className="text-[11px] text-tinapple-subtext font-mono">
                {formatBytes(telemetry.memory.usedBytes)} / {formatBytes(telemetry.memory.totalBytes)}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-tinapple-purple/10 text-tinapple-purple border border-tinapple-purple/20 font-mono">
            RAM
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            <CountUp to={telemetry.memory.usagePercent} decimals={1} suffix="%" />
          </div>
          <span className="text-xs text-tinapple-subtext font-mono">
            Free: {formatBytes(telemetry.memory.freeBytes)}
          </span>
        </div>

        <Sparkline data={history.memory} strokeColor="#bb9af7" fillColor="rgba(187, 154, 247, 0.15)" />
      </SpotlightCard>

      {/* STORAGE CARD */}
      <SpotlightCard
        className="p-5"
        spotlightColor="rgba(115, 218, 202, 0.18)"
        borderColor="rgba(115, 218, 202, 0.5)"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tinapple-text">Storage</h3>
              <p className="text-[11px] text-tinapple-subtext font-mono">
                {telemetry.disk.mountPoint} (Btrfs / ZFS)
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-tinapple-green/10 text-tinapple-green border border-tinapple-green/20 font-mono">
            Root
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            <CountUp to={telemetry.disk.usagePercent} decimals={1} suffix="%" />
          </div>
          <span className="text-xs text-tinapple-subtext font-mono">
            {formatBytes(telemetry.disk.freeBytes)} free
          </span>
        </div>

        {/* Storage Multi-segment bar */}
        <div className="h-9 flex flex-col justify-center">
          <div className="h-2 w-full rounded-full bg-tinapple-dark/60 border border-tinapple-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-tinapple-green to-tinapple-cyan transition-all duration-500"
              style={{ width: `${Math.min(100, telemetry.disk.usagePercent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-tinapple-muted font-mono">
            <span>Used: {formatBytes(telemetry.disk.usedBytes)}</span>
            <span>Total: {formatBytes(telemetry.disk.totalBytes)}</span>
          </div>
        </div>
      </SpotlightCard>

      {/* NETWORK CARD */}
      <SpotlightCard
        className="p-5"
        spotlightColor="rgba(125, 207, 255, 0.18)"
        borderColor="rgba(125, 207, 255, 0.5)"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-tinapple-cyan/15 text-tinapple-cyan border border-tinapple-cyan/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-tinapple-text">Network</h3>
              <p className="text-[11px] text-tinapple-subtext font-mono">
                {telemetry.network.interfaces.slice(0, 2).join(', ') || 'Online'}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-tinapple-cyan/10 text-tinapple-cyan border border-tinapple-cyan/20 font-mono">
            Mesh / LAN
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-tinapple-green">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{formatRate(telemetry.network.rateIn)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-tinapple-cyan">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{formatRate(telemetry.network.rateOut)}</span>
          </div>
        </div>

        <Sparkline data={history.netIn} strokeColor="#7dcfff" fillColor="rgba(125, 207, 255, 0.15)" />
      </SpotlightCard>
    </div>
  );
};

// Canvas Sparkline component
interface SparklineProps {
  data: number[];
  strokeColor: string;
  fillColor: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, strokeColor, fillColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 200);
    const height = (canvas.height = 36);

    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) return;

    const maxVal = Math.max(100, ...data);
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const stepX = width / (data.length - 1);

    ctx.beginPath();
    ctx.moveTo(0, height - ((data[0] - minVal) / range) * (height - 6) - 3);

    for (let i = 1; i < data.length; i++) {
      const x = i * stepX;
      const y = height - ((data[i] - minVal) / range) * (height - 6) - 3;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Fill under line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }, [data, strokeColor, fillColor]);

  return <canvas ref={canvasRef} className="w-full h-9 block" />;
};
export default TelemetryCards;
