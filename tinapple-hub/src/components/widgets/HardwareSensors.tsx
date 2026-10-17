import React from 'react';
import { Cpu, Shield, ShieldAlert, Disc, CircuitBoard, Layers, Server } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import { HardwareInfo } from '../../types/api';

interface HardwareSensorsProps {
  hardware: HardwareInfo;
}

export const HardwareSensors: React.FC<HardwareSensorsProps> = ({ hardware }) => {
  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PLATFORM PROFILE */}
        <SpotlightCard className="p-5" spotlightColor="rgba(122, 162, 247, 0.15)">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-tinapple-blue/15 text-tinapple-blue border border-tinapple-blue/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-tinapple-subtext uppercase tracking-wider font-mono">
                Hardware Profile
              </h4>
              <p className="text-sm font-bold text-white mt-0.5">{hardware.profile}</p>
            </div>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-tinapple-border/50 text-xs font-mono">
            <div className="flex justify-between text-tinapple-subtext">
              <span>Architecture:</span>
              <span className="text-tinapple-text">{hardware.cpu.arch}</span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>Topology:</span>
              <span className="text-tinapple-text">
                {hardware.cpu.cores} Cores / {hardware.cpu.threads} Threads
              </span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>Total RAM:</span>
              <span className="text-tinapple-text">{hardware.memoryGb} GB DDR5</span>
            </div>
          </div>
        </SpotlightCard>

        {/* SECURITY & TPM */}
        <SpotlightCard className="p-5" spotlightColor="rgba(115, 218, 202, 0.15)">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-tinapple-subtext uppercase tracking-wider font-mono">
                Hardware Security
              </h4>
              <p className="text-sm font-bold text-white mt-0.5">TPM 2.0 Cryptoprocessor</p>
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-tinapple-border/50 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-tinapple-subtext">TPM 2.0 Chip:</span>
              <span className="px-2 py-0.5 rounded bg-tinapple-green/10 text-tinapple-green font-semibold border border-tinapple-green/20">
                {hardware.tpm2Present ? 'Detected (tpm_crb)' : 'Absent'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-tinapple-subtext">Secure Boot:</span>
              <span className="px-2 py-0.5 rounded bg-tinapple-dark text-tinapple-muted border border-tinapple-border">
                {hardware.secureBootEnabled ? 'Enforced' : 'Disabled / Setup Mode'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-tinapple-subtext">LUKS Keyring:</span>
              <span className="text-tinapple-cyan">tpm2-autounlock ready</span>
            </div>
          </div>
        </SpotlightCard>

        {/* GPU & ACCELERATION */}
        <SpotlightCard className="p-5" spotlightColor="rgba(187, 154, 247, 0.15)">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-tinapple-purple/15 text-tinapple-purple border border-tinapple-purple/20">
              <CircuitBoard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-tinapple-subtext uppercase tracking-wider font-mono">
                Graphics & Video
              </h4>
              <p className="text-sm font-bold text-white mt-0.5">
                {hardware.gpu?.model || 'Hardware Acceleration'}
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-tinapple-border/50 text-xs font-mono">
            <div className="flex justify-between text-tinapple-subtext">
              <span>Driver:</span>
              <span className="text-tinapple-text">{hardware.gpu?.driver || 'amdgpu'}</span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>VRAM Allocation:</span>
              <span className="text-tinapple-text">{hardware.gpu?.vramMb ?? 4096} MB Shared</span>
            </div>
            <div className="flex justify-between text-tinapple-subtext">
              <span>Acceleration API:</span>
              <span className="text-tinapple-purple">VA-API / Vulkan 1.3</span>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Storage Physical Disks */}
      <SpotlightCard className="p-5" spotlightColor="rgba(125, 207, 255, 0.12)">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Disc className="w-4 h-4 text-tinapple-cyan" />
          <span>Physical Block Storage Devices</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hardware.storageDrives.map((drive) => (
            <div
              key={drive.name}
              className="p-3.5 rounded-xl bg-tinapple-dark/60 border border-tinapple-border flex items-center justify-between font-mono"
            >
              <div>
                <span className="text-xs font-bold text-tinapple-text">/dev/{drive.name}</span>
                <p className="text-[11px] text-tinapple-subtext">{drive.model}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-tinapple-cyan">{drive.sizeGb} GB</span>
                <span className="text-[10px] block uppercase text-tinapple-muted">{drive.type}</span>
              </div>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </div>
  );
};
export default HardwareSensors;
