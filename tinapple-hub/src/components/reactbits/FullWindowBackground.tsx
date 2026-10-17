import React from 'react';
import Waves from './Waves';
import Particles from './Particles';
import MicroSlats from './MicroSlats';

export type BackgroundMode = 'waves' | 'microslats';

interface FullWindowBackgroundProps {
  mode?: BackgroundMode;
}

export const FullWindowBackground: React.FC<FullWindowBackgroundProps> = ({ mode = 'microslats' }) => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-tinapple-dark">
      {/* Background Mode: Micro Slats (Tactile Physical Hardware Matrix) */}
      {mode === 'microslats' ? (
        <div className="absolute inset-0 pointer-events-auto">
          <MicroSlats
            preset="swell"
            color="#0b0e14"
            glintColor="#e5b567"
            backgroundColor="#060709"
            slatWidth={20}
            slatHeight={72}
            gap={6}
            roundness={0.3}
            interactive={true}
            cursorStrength={2.2}
            cursorSize={130}
            lean={0.65}
            contrast={1.4}
            glint={1.8}
            speed={0.45}
          />
        </div>
      ) : (
        /* Background Mode: WebGL Waves Grid */
        <div className="absolute inset-0 pointer-events-auto">
          <Waves
            lineColor="rgba(229, 181, 103, 0.14)"
            accentColor="rgba(126, 199, 137, 0.25)"
            backgroundColor="#060709"
            spacing={28}
            amplitude={36}
            speed={0.6}
            mouseInteraction={true}
            clickRipple={true}
            opacity={0.85}
          />
        </div>
      )}

      {/* Layer 2: Subtle Tropical Amber & Sage Radial Nebulae */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none blur-[120px] opacity-25"
        style={{
          background: 'radial-gradient(circle, #e5b567 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full pointer-events-none blur-[140px] opacity-20"
        style={{
          background: 'radial-gradient(circle, #7ec789 0%, transparent 70%)',
        }}
      />

      {/* Layer 3: Floating connective golden and emerald constellation particles */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <Particles
          particleCount={25}
          particleColors={['#e5b567', '#7ec789', '#f3f4f6']}
          particleSpread={15}
          speed={0.35}
          particleBaseSize={80}
          sizeRandomness={0.7}
          moveParticlesOnHover={true}
          connections={true}
          connectionDistance={120}
          glow={0.7}
        />
      </div>

      {/* Layer 4: Vignette & Cyber Grid Texture */}
      <div className="absolute inset-0 bg-gradient-to-t from-tinapple-dark via-transparent to-tinapple-dark/60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none opacity-40" />
    </div>
  );
};
export default FullWindowBackground;
