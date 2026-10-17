import React from 'react';
import { Cpu, Shield, Disc, CircuitBoard, Server, CheckCircle2 } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { HardwareInfo } from '../../types/api';

interface HardwareSensorsProps {
  hardware: HardwareInfo;
}

export const HardwareSensors: React.FC<HardwareSensorsProps> = ({ hardware }) => {
  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* PLATFORM PROFILE */}
        <SpotlightCard className="p-6" spotlightColor="rgba(229, 181, 103, 0.15)" borderColor="rgba(229, 181, 103, 0.4)">
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
              <span className="text-tinapple-gold font-bold">x86-64-v4 (AVX-512)</span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>Core Topology:</span>
              <span className="text-white">
                {hardware.cpu.cores} Cores / {hardware.cpu.threads} Threads
              </span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>Total RAM:</span>
              <span className="text-tinapple-green font-bold">{hardware.memoryGb} GB DDR5</span>
            </div>
          </div>
        </SpotlightCard>

        {/* SECURITY & TPM */}
        <SpotlightCard className="p-6" spotlightColor="rgba(126, 199, 137, 0.15)" borderColor="rgba(126, 199, 137, 0.4)">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-2xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/25">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-tinapple-subtext uppercase tracking-wider font-mono">
                Hardware Security
              </h4>
              <p className="text-sm font-bold text-white mt-0.5">TPM 2.0 Cryptoprocessor</p>
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-tinapple-border/70 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-tinapple-subtext">TPM 2.0 State:</span>
              <span className="px-2 py-0.5 rounded-md bg-tinapple-green/15 text-tinapple-green font-bold border border-tinapple-green/25 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active (CRB)</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-tinapple-subtext">Secure Boot:</span>
              <span className="px-2 py-0.5 rounded-md bg-tinapple-dark text-tinapple-muted border border-tinapple-border">
                {hardware.secureBootEnabled ? 'Enforced' : 'Custom / Unlocked'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-tinapple-subtext">LUKS Autounlock:</span>
              <span className="text-tinapple-gold font-bold">tpm2-pcr-sealed</span>
            </div>
          </div>
        </SpotlightCard>

        {/* GPU & ACCELERATION */}
        <SpotlightCard className="p-6" spotlightColor="rgba(229, 181, 103, 0.15)" borderColor="rgba(229, 181, 103, 0.4)">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-2xl bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25">
              <CircuitBoard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-tinapple-subtext uppercase tracking-wider font-mono">
                GPU Acceleration
              </h4>
              <p className="text-sm font-bold text-white mt-0.5">
                {hardware.gpu?.model || 'Radeon 780M RDNA3'}
              </p>
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-tinapple-border/70 text-xs font-mono">
            <div className="flex justify-between text-tinapple-subtext">
              <span>Mesa Driver:</span>
              <span className="text-white">radv / amdgpu</span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>Hardware Video:</span>
              <span className="text-tinapple-green font-bold">VA-API AV1/HEVC</span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>Vulkan Runtime:</span>
              <span className="text-tinapple-gold font-bold">Vulkan 1.3.296</span>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Storage Physical Disks */}
      <SpotlightCard className="p-6" spotlightColor="rgba(126, 199, 137, 0.12)" borderColor="rgba(126, 199, 137, 0.35)">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 font-mono uppercase tracking-wide">
          <Disc className="w-4 h-4 text-tinapple-green" />
          <span>Physical Storage Controller & NVMe Fabric</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hardware.storageDrives.map((drive) => (
            <div
              key={drive.name}
              className="p-4 rounded-xl bg-tinapple-dark/80 border border-tinapple-border flex items-center justify-between font-mono"
            >
              <div>
                <span className="text-sm font-bold text-white">/dev/{drive.name}</span>
                <p className="text-xs text-tinapple-subtext mt-0.5">{drive.model}</p>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-tinapple-gold">{drive.sizeGb} GB</span>
                <span className="text-[10px] block uppercase text-tinapple-green font-bold">{drive.type} Gen4</span>
              </div>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </div>
  );
};
export default HardwareSensors;
