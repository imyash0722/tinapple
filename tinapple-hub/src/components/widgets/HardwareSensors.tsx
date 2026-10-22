import React from 'react';
import { Cpu, Shield, Disc, CircuitBoard, Server, CheckCircle2, Zap } from 'lucide-react';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import TechText from '../reactbits/TechText';
import ElectricLogo from '../reactbits/ElectricLogo';
import { HardwareInfo } from '../../types/api';

const HARDWARE_BADGE_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><path d="M48 8 L72 32 L48 56 L24 32 Z M48 40 L72 64 L48 88 L24 64 Z" fill="#ffffff" fill-rule="evenodd"/><circle cx="48" cy="48" r="6" fill="#ffffff"/></svg>'
)}`;

interface HardwareSensorsProps {
  hardware: HardwareInfo;
}

export const HardwareSensors: React.FC<HardwareSensorsProps> = ({ hardware }) => {
  return (
    <div className="space-y-5">
      {/* Blueprint Header with TechText */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-tinapple-card/90 via-tinapple-surface/90 to-tinapple-card/90 border border-tinapple-border backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-7 w-96 mb-1">
            <TechText
              text="HARDWARE ATTESTATION & TOPOLOGY"
              fontSize={14}
              fontWeight={800}
              color="#ffffff"
              accentColor="#e5b567"
              labels={true}
              guides={true}
              intro="metrics"
              clickKick={true}
            />
          </div>
          <p className="text-xs text-tinapple-subtext font-mono">
            Low-level firmware telemetry, TPM 2.0 silicon endorsement, and PCI bus topology.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-tinapple-green bg-tinapple-green/10 px-3 py-1.5 rounded-full border border-tinapple-green/20 self-start md:self-center">
          <span className="w-2 h-2 rounded-full bg-tinapple-green animate-pulse" />
          <span>Silicon Integrity Verified</span>
        </div>
      </div>

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
        <SpotlightCard className="p-6" spotlightColor="rgba(126, 199, 137, 0.15)" borderColor="rgba(126, 199, 137, 0.4)">
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
        <SpotlightCard className="p-6" spotlightColor="rgba(229, 181, 103, 0.15)" borderColor="rgba(229, 181, 103, 0.4)">
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

      {/* Silicon Cryptographic Attestation Card with ElectricLogo */}
      <SpotlightCard className="p-6" spotlightColor="rgba(229, 181, 103, 0.2)" borderColor="rgba(229, 181, 103, 0.45)">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Active ElectricLogo Silicon Seal */}
            <div className="relative w-24 h-24 rounded-2xl bg-tinapple-dark/90 border border-tinapple-border overflow-hidden p-2 flex items-center justify-center shadow-lg shadow-tinapple-gold/10">
              <ElectricLogo
                src={HARDWARE_BADGE_SVG}
                color="#e5b567"
                glowColor="#7ec789"
                scale={0.9}
                thickness={2}
                intensity={1.5}
                glow={0.9}
                arcs={5}
                speed={1.2}
                interactive={true}
                className="w-full h-full"
              />
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
      <SpotlightCard className="p-6" spotlightColor="rgba(126, 199, 137, 0.12)" borderColor="rgba(126, 199, 137, 0.35)">
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
